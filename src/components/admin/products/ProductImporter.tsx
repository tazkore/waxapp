import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCanImportProducts } from "@/hooks/useCanImportProducts";
import { insertWithRetry, isRlsError } from "@/lib/insertWithRetry";
import RlsErrorPanel from "./RlsErrorPanel";
import AutoImagePicker from "./AutoImagePicker";
import ProductPreviewCard from "./ProductPreviewCard";
import { aggregateValidation, validateProductRow } from "@/lib/validateProductRow";
import { norm, type CatalogEntry } from "@/lib/categoryBrandSuggester";
import { normalizeSeoMetadata } from "@/lib/normalizeSeoMetadata";
import {
  Loader2,
  Globe,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  ShieldAlert,
  FileText,
} from "lucide-react";

type Provider =
  | "firecrawl"
  | "jina"
  | "scrapingbee"
  | "readability"
  | "browserless"
  | "scraperapi"
  | "scrapfly"
  | "diffbot"
  | "zenrows";

const PROVIDERS: Array<{ id: Provider; label: string; hint: string; group: "free" | "key" }> = [
  { id: "readability", label: "Sin API (gratis)", hint: "Fetch directo + JSON-LD/OG", group: "free" },
  { id: "jina", label: "Jina Reader (gratis)", hint: "No requiere key", group: "free" },
  { id: "diffbot", label: "Diffbot Product", hint: "Producto estructurado de alta calidad", group: "key" },
  { id: "firecrawl", label: "Firecrawl", hint: "Más preciso, requiere key", group: "key" },
  { id: "browserless", label: "Browserless", hint: "Chrome headless con JS", group: "key" },
  { id: "scraperapi", label: "ScraperAPI", hint: "Render JS + proxy", group: "key" },
  { id: "scrapfly", label: "Scrapfly", hint: "Render JS + anti-bot", group: "key" },
  { id: "zenrows", label: "ZenRows", hint: "Render JS + bypass", group: "key" },
  { id: "scrapingbee", label: "ScrapingBee", hint: "JS rendering, requiere key", group: "key" },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const parseFnError = (data: any, error: any): string => {
  if (data?.error?.message) {
    const code = data.error.code ? `[${data.error.code}] ` : "";
    return `${code}${data.error.message}`;
  }
  if (typeof data?.error === "string") return data.error;
  return error?.message || "Error desconocido";
};

interface Props {
  onImported: () => void;
  onSwitchToCatalog: () => void;
  onJobsChanged?: () => void;
}

const ProductImporter = ({ onImported, onSwitchToCatalog, onJobsChanged }: Props) => {
  const { toast } = useToast();
  const { canImport, role, loading: roleLoading, isSuperAdmin } = useCanImportProducts();
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<Provider>("readability");
  const [useAi, setUseAi] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [selectedP, setSelectedP] = useState<Set<number>>(new Set());
  const [previewProducts, setPreviewProducts] = useState<any[] | null>(null);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [autoImgBusy, setAutoImgBusy] = useState(false);
  const [aiBatchBusy, setAiBatchBusy] = useState(false);
  const [aiBatchProgress, setAiBatchProgress] = useState({ done: 0, total: 0 });
  const [rowImageBusy, setRowImageBusy] = useState<Set<number>>(new Set());
  const [rowAiBusy, setRowAiBusy] = useState<Set<number>>(new Set());
  const currentJobId = useRef<string | null>(null);
  const [brandCatalog, setBrandCatalog] = useState<CatalogEntry[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<CatalogEntry[]>([]);

  // Load existing brands and distinct categories once for fuzzy suggestions
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: brandRows }, { data: prodRows }] = await Promise.all([
        supabase.from("brands").select("name").eq("is_active", true).limit(500),
        supabase.from("products").select("category").not("category", "is", null).limit(1000),
      ]);
      if (!alive) return;
      const brands: CatalogEntry[] = (brandRows || [])
        .map((r: any) => r.name)
        .filter((n: any): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n: string) => ({ label: n, match: norm(n) }));
      const seen = new Set<string>();
      const cats: CatalogEntry[] = [];
      for (const r of prodRows || []) {
        const c = (r as any).category;
        if (typeof c !== "string") continue;
        const k = norm(c);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        cats.push({ label: c, match: k });
      }
      setBrandCatalog(brands);
      setCategoryCatalog(cats);
    })();
    return () => { alive = false; };
  }, []);

  /** Patch a single row in `products` (used by per-row suggestions) */
  const applyRowPatch = (i: number, patch: Record<string, any>) => {
    setProducts((curr) => {
      const copy = [...curr];
      if (copy[i]) copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  };

  const setRowBusy = (which: "img" | "ai", i: number, busy: boolean) => {
    const setter = which === "img" ? setRowImageBusy : setRowAiBusy;
    setter((prev) => {
      const n = new Set(prev);
      busy ? n.add(i) : n.delete(i);
      return n;
    });
  };

  const autoImageRow = async (i: number) => {
    const it = products[i];
    if (!it?.name) return;
    setRowBusy("img", i, true);
    try {
      const { data, error } = await supabase.functions.invoke("find-product-image", {
        body: { name: it.name, brand: it.brand, category: it.category, gtin: it.gtin, count: 1 },
      });
      const img = data?.images?.[0];
      if (!error && img) {
        setProducts((curr) => {
          const copy = [...curr];
          if (copy[i]) copy[i] = { ...copy[i], images: [img, ...(copy[i].images || []).filter((u: string) => u !== img)] };
          return copy;
        });
        toast({ title: "Imagen encontrada" });
      } else {
        toast({ title: "Sin resultados", description: "Prueba con \"Elegir\" para ver opciones.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRowBusy("img", i, false);
    }
  };

  const autoFillAiRow = async (i: number) => {
    const it = products[i];
    if (!it?.name) return;
    setRowBusy("ai", i, true);
    try {
      const { data, error } = await supabase.functions.invoke("product-autofill", {
        body: {
          product: {
            name: it.name, description: it.description, category: it.category,
            brand_name: it.brand, price: it.price, sku: it.sku, gtin: it.gtin,
            canonical_url: it.source_url,
          },
          only_missing: true,
        },
      });
      if (error || !data?.proposal) throw new Error(error?.message || "Sin propuesta");
      const p = data.proposal;
      setProducts((curr) => {
        const copy = [...curr];
        if (copy[i]) {
          copy[i] = {
            ...copy[i],
            description: copy[i].description || p.description,
            short_description: copy[i].short_description || p.short_description,
            category: copy[i].category || p.category,
            meta_title: copy[i].meta_title || p.meta_title,
            meta_description: copy[i].meta_description || p.meta_description,
            focus_keyword: copy[i].focus_keyword || p.focus_keyword,
            meta_keywords: p.meta_keywords || copy[i].meta_keywords,
            tags: p.tags || copy[i].tags,
            attributes: { ...(copy[i].attributes || {}), ...(p.attributes || {}) },
          };
        }
        return copy;
      });
      toast({ title: "Producto enriquecido con IA" });
    } catch (e: any) {
      toast({ title: "IA no disponible", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRowBusy("ai", i, false);
    }
  };

  const map = async () => {
    if (!isHttpUrl(url.trim())) {
      toast({ title: "URL inválida", description: "Escribe https://…", variant: "destructive" });
      return;
    }
    setBusy("map");
    setPreviewProducts(null);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-map", {
        body: { url: url.trim(), limit: 100, provider },
      });
      if (error || data?.error) throw new Error(parseFnError(data, error));
      const found: string[] = data.links || [];
      setLinks(found);
      const likely = found.filter((l) =>
        /\/(product|producto|p|item|productos|shop|tienda)[\/-]/i.test(l),
      );
      setSelected(new Set(likely.length ? likely : found.slice(0, 20)));
      toast({ title: "Sitio mapeado", description: `${found.length} URLs encontradas` });
    } catch (e: any) {
      toast({ title: "Error al mapear", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    if (selected.size === 0) {
      toast({ title: "Selecciona al menos 1 URL", variant: "destructive" });
      return;
    }
    setBusy("preview");
    try {
      const sample = Array.from(selected).slice(0, 2);
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", {
        body: { urls: sample, provider, preview: true, use_ai: useAi },
      });
      if (error || data?.error) throw new Error(parseFnError(data, error));
      const list = data.products || [];
      setPreviewProducts(list);
      toast({
        title: "Vista previa lista",
        description: `${list.length}/${sample.length} productos extraídos. Revisa antes de importar todo.`,
      });
    } catch (e: any) {
      toast({ title: "Error en vista previa", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const extract = async () => {
    if (selected.size === 0) {
      toast({ title: "Selecciona al menos 1 URL", variant: "destructive" });
      return;
    }
    setBusy("extract");
    try {
      // Create import_jobs row
      const urlsArr = Array.from(selected);
      const { data: job, error: jobErr } = await supabase
        .from("import_jobs")
        .insert({
          source_url: url.trim(),
          status: "pending",
          urls_found: urlsArr.length,
          discovered_urls: urlsArr,
        })
        .select()
        .single();
      if (jobErr) throw jobErr;
      currentJobId.current = job.id;


      onJobsChanged?.();

      const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", {
        body: { urls: urlsArr, provider, use_ai: useAi, job_id: job.id },
      });
      if (error || data?.error) throw new Error(parseFnError(data, error));
      const list = data.products || [];
      setProducts(list);
      setSelectedP(new Set(list.map((_: any, i: number) => i)));
      onJobsChanged?.();
      if (list.length === 0) {
        toast({
          title: "Sin productos extraídos",
          description: "Prueba con otro proveedor o revisa el historial para detalles.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Productos extraídos", description: `${list.length} candidatos` });
      }
    } catch (e: any) {
      toast({ title: "Error al extraer", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const validateRow = (it: any, idx: number): { row?: any; errors: string[] } => {
    const v = validateProductRow(it);
    if (!v.canImport) {
      return { errors: v.errors.map((e) => e.message) };
    }
    const name = String(it.name).trim();
    const priceNum = Number(it?.price) || 0;
    const compareNum = it?.compare_at_price != null && it.compare_at_price !== "" ? Number(it.compare_at_price) : null;
    const img = Array.isArray(it?.images) ? it.images[0] : it?.image_url;
    const gallery: string[] = Array.isArray(it?.images)
      ? it.images.filter((u: any) => typeof u === "string" && isHttpUrl(u))
      : [];
    const description = it?.description ? String(it.description).slice(0, 4000) : null;
    const attributes = it?.attributes && typeof it.attributes === "object" ? it.attributes : {};
    const canonical = it?.source_url || it?.canonical_url || null;
    return {
      errors: [],
      row: {
        name: name.slice(0, 200),
        slug: slugify(name) || `producto-${Date.now()}-${idx}`,
        description,
        short_description: it?.short_description || (description ? description.slice(0, 160) : null),
        price: priceNum,
        stock: 0,
        sku: it?.sku ? String(it.sku).slice(0, 60) : null,
        category: it?.category ? String(it.category).slice(0, 100) : null,
        brand_name: it?.brand ? String(it.brand).slice(0, 100) : null,
        gtin: it?.gtin ? String(it.gtin).slice(0, 60) : null,
        compare_at_price: compareNum != null && Number.isFinite(compareNum) ? compareNum : null,
        image_url: img && isHttpUrl(img) ? img : null,
        gallery_urls: gallery,
        meta_title: it?.meta_title || name.slice(0, 60),
        meta_description: it?.meta_description || (description ? description.slice(0, 160) : null),
        focus_keyword: it?.focus_keyword || name.split(" ").slice(0, 3).join(" "),
        meta_keywords: Array.isArray(it?.meta_keywords) ? it.meta_keywords : [],
        tags: Array.isArray(it?.tags) ? it.tags : [],
        attributes,
        canonical_url: canonical && isHttpUrl(canonical) ? canonical : null,
        is_active: false,
        // ----- Advanced metadata mapping (scraper or AI autofill may provide these) -----
        metadata_template: it?.metadata_template || attributes?.metadata_template || null,
        specifications: Array.isArray(it?.specifications) ? it.specifications : [],
        warnings: Array.isArray(it?.warnings) ? it.warnings : (typeof attributes?.warnings === "string" ? [attributes.warnings] : []),
        ingredients: Array.isArray(it?.ingredients) ? it.ingredients : (Array.isArray(attributes?.ingredients) ? attributes.ingredients : []),
        flavor_profile: Array.isArray(it?.flavor_profile) ? it.flavor_profile : (Array.isArray(attributes?.flavors) ? attributes.flavors : []),
        country_of_origin: it?.country_of_origin || attributes?.country_origin || null,
        material: it?.material || attributes?.material || null,
        battery_mah: it?.battery_mah != null ? Number(it.battery_mah) : (attributes?.battery_mah != null ? Number(attributes.battery_mah) : null),
        puffs_estimate: it?.puffs_estimate != null ? Number(it.puffs_estimate) : (attributes?.puffs != null ? Number(attributes.puffs) : null),
        nicotine_mg: it?.nicotine_mg != null ? Number(it.nicotine_mg) : null,
        vaporizer_type: it?.vaporizer_type || attributes?.vaporizer_type || null,
        thc_percentage: it?.thc_percentage != null ? Number(it.thc_percentage) : null,
        cbd_percentage: it?.cbd_percentage != null ? Number(it.cbd_percentage) : null,
        strain_type: it?.strain_type || null,
        terpenes: Array.isArray(it?.terpenes) ? it.terpenes : [],
        capacity_ml: it?.capacity_ml != null ? Number(it.capacity_ml) : (attributes?.volume_ml != null ? Number(attributes.volume_ml) : null),
        pg_vg_ratio: it?.pg_vg_ratio || null,
        compatibility: Array.isArray(it?.compatibility) ? it.compatibility : [],
        warranty_months: it?.warranty_months != null ? Number(it.warranty_months) : null,
      },
    };
  };

  const logFailureToJob = async (msg: string) => {
    if (!currentJobId.current) return;
    try {
      await supabase
        .from("import_jobs")
        .update({ status: "failed", error: msg.slice(0, 2000) })
        .eq("id", currentJobId.current);
      onJobsChanged?.();
    } catch (e) {
      console.error("Could not log failure to job", e);
    }
  };

  const autoFillImages = async () => {
    const missing = products
      .map((it: any, i: number) => ({ it, i }))
      .filter((x) => !(Array.isArray(x.it.images) && x.it.images[0]) && x.it?.name);
    if (!missing.length) {
      toast({ title: "Todos los productos ya tienen imagen" });
      return;
    }
    setAutoImgBusy(true);
    let filled = 0;
    // 3 concurrentes
    const queue = [...missing];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) break;
        try {
          const { data, error } = await supabase.functions.invoke("find-product-image", {
            body: {
              name: next.it.name,
              brand: next.it.brand || "",
              category: next.it.category || "",
              gtin: next.it.gtin || "",
              count: 1,
            },
          });
          const img = data?.images?.[0];
          if (!error && img) {
            setProducts((curr) => {
              const copy = [...curr];
              if (copy[next.i]) copy[next.i] = { ...copy[next.i], images: [img] };
              return copy;
            });
            filled++;
          }
        } catch (e) {
          console.error("auto-image err", e);
        }
      }
    });
    await Promise.all(workers);
    setAutoImgBusy(false);
    toast({ title: `Auto-imagen completada`, description: `${filled}/${missing.length} encontradas` });
  };

  const autoFillWithAi = async (scope: "selected" | "all" = "selected") => {
    const indices = scope === "all"
      ? products.map((_, i) => i)
      : Array.from(selectedP);
    if (!indices.length) {
      toast({
        title: scope === "all" ? "No hay productos extraídos" : "Selecciona productos primero",
        variant: "destructive",
      });
      return;
    }
    setAiBatchBusy(true);
    setAiBatchProgress({ done: 0, total: indices.length });
    let filled = 0;
    let failed = 0;
    const queue = [...indices];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const i = queue.shift();
        if (i == null) break;
        const it = products[i];
        if (!it) continue;
        try {
          const { data, error } = await supabase.functions.invoke("product-autofill", {
            body: {
              product: {
                name: it.name,
                description: it.description,
                short_description: it.short_description,
                category: it.category,
                brand_name: it.brand,
                price: it.price,
                sku: it.sku,
                gtin: it.gtin,
                canonical_url: it.source_url,
              },
              only_missing: true,
            },
          });
          if (!error && data?.proposal) {
            setProducts((curr) => {
              const copy = [...curr];
              if (copy[i]) {
                const p = data.proposal;
                copy[i] = {
                  ...copy[i],
                  description: copy[i].description || p.description,
                  short_description: copy[i].short_description || p.short_description,
                  long_description_html: copy[i].long_description_html || p.long_description_html,
                  category: copy[i].category || p.category,
                  meta_title: copy[i].meta_title || p.meta_title,
                  meta_description: copy[i].meta_description || p.meta_description,
                  focus_keyword: copy[i].focus_keyword || p.focus_keyword,
                  meta_keywords: p.meta_keywords || copy[i].meta_keywords,
                  tags: p.tags || copy[i].tags,
                  attributes: { ...(p.attributes || {}), ...(copy[i].attributes || {}) },
                };
              }
              return copy;
            });
            filled++;
          } else {
            failed++;
            if (data?.error) console.warn("autofill row failed", data.error);
          }
        } catch (e) {
          failed++;
          console.error("autofill err", e);
        } finally {
          setAiBatchProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
    });
    await Promise.all(workers);
    setAiBatchBusy(false);
    toast({
      title: failed === indices.length ? "IA no disponible" : "Metadatos completados",
      description: `${filled}/${indices.length} productos enriquecidos${failed ? ` · ${failed} fallaron` : ""}`,
      variant: failed === indices.length ? "destructive" : "default",
    });
  };

  const normalizeSeoBatch = (scope: "selected" | "all" = "all") => {
    const indices = scope === "all"
      ? products.map((_, i) => i)
      : Array.from(selectedP);
    if (!indices.length) {
      toast({
        title: scope === "all" ? "No hay productos para normalizar" : "Selecciona productos primero",
        variant: "destructive",
      });
      return;
    }

    let touched = 0;
    const changeSummary: Record<string, number> = {};
    const sampleChanges: string[] = [];

    setProducts((curr) => {
      const copy = [...curr];
      for (const i of indices) {
        const row = copy[i];
        if (!row) continue;
        const { patch, changes } = normalizeSeoMetadata(row);
        if (Object.keys(patch).length === 0) continue;
        copy[i] = { ...row, ...patch };
        touched++;
        for (const c of changes) {
          const key = c.split(" ")[0];
          changeSummary[key] = (changeSummary[key] || 0) + 1;
        }
        if (sampleChanges.length < 3) {
          sampleChanges.push(`#${i + 1} ${row.name?.slice(0, 30) || "—"}: ${changes.join(", ")}`);
        }
      }
      return copy;
    });

    if (touched === 0) {
      toast({
        title: "Todo en orden",
        description: "Los metadatos SEO ya están completos y dentro de los límites recomendados.",
      });
      return;
    }

    const summary = Object.entries(changeSummary)
      .map(([k, n]) => `${k}: ${n}`)
      .join(" · ");

    toast({
      title: `SEO normalizado en ${touched}/${indices.length} productos`,
      description: `${summary}\n${sampleChanges.join("\n")}`,
    });
  };

  const importProducts = async () => {
    setRlsError(null);

    if (!canImport) {
      setRlsError(`Tu rol "${role || "ninguno"}" no puede insertar en la tabla products.`);
      return;
    }

    const items = Array.from(selectedP).map((i) => ({ it: products[i], i })).filter((x) => x.it);
    if (!items.length) return;
    setBusy("import");
    try {
      const rows: any[] = [];
      const invalid: Array<{ idx: number; name: string; errors: string[] }> = [];
      for (const { it, i } of items) {
        const { row, errors } = validateRow(it, i);
        if (row) rows.push(row);
        else invalid.push({ idx: i + 1, name: it?.name || `#${i + 1}`, errors });
      }

      if (invalid.length) {
        const sample = invalid.slice(0, 3).map((v) => `• ${v.name}: ${v.errors.join(", ")}`).join("\n");
        toast({
          title: `${invalid.length} producto(s) inválidos omitidos`,
          description: sample + (invalid.length > 3 ? `\n…+${invalid.length - 3} más` : ""),
          variant: invalid.length === items.length ? "destructive" : "default",
        });
      }
      if (!rows.length) {
        setBusy(null);
        return;
      }

      const { error, attempts, retried } = await insertWithRetry("products", rows);
      if (error) {
        const msg = error.message || String(error);
        if (isRlsError(error)) {
          setRlsError(msg);
          await logFailureToJob(`RLS denied (${attempts} attempts): ${msg}`);
          toast({
            title: "Sin permisos para importar",
            description: "Revisa el panel de error abajo.",
            variant: "destructive",
          });
        } else {
          await logFailureToJob(`Insert failed after ${attempts} attempt(s): ${msg}`);
          toast({
            title: "Error al importar",
            description: `${msg} (${attempts} intento${attempts > 1 ? "s" : ""})`,
            variant: "destructive",
          });
        }
        return;
      }

      if (currentJobId.current) {
        await supabase
          .from("import_jobs")
          .update({ status: "completed", products_imported: rows.length })
          .eq("id", currentJobId.current);
        onJobsChanged?.();
      }

      toast({
        title: "Importados",
        description: `${rows.length} productos creados como borradores${retried ? ` (recuperado tras ${attempts} intentos)` : ""}`,
      });
      setProducts([]);
      setSelectedP(new Set());
      setLinks([]);
      setSelected(new Set());
      setPreviewProducts(null);
      currentJobId.current = null;
      onImported();
      onSwitchToCatalog();
    } catch (e: any) {
      const msg = e?.message || String(e);
      await logFailureToJob(`Unexpected: ${msg}`);
      toast({ title: "Error al importar", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {!roleLoading && !canImport && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permisos insuficientes</AlertTitle>
          <AlertDescription className="text-sm">
            Tu rol actual <strong className="font-mono">{role || "ninguno"}</strong> no puede insertar productos.
            Puedes mapear y extraer, pero la importación final requiere rol{" "}
            <strong>admin</strong>, <strong>super_admin</strong> o <strong>moderator</strong>.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Importar productos desde URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tienda-ejemplo.com"
              className="flex-1 min-w-[260px]"
            />
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="bg-muted border border-border rounded px-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button onClick={map} disabled={busy === "map" || !url.trim()} className="gap-2">
              {busy === "map" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Mapear sitio
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={useAi} onCheckedChange={(v) => setUseAi(!!v)} />
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Usar IA si JSON-LD/OG no son suficientes</span>
            </label>
            <span className="opacity-70">· {PROVIDERS.find((p) => p.id === provider)?.hint}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Los productos se importan como borradores (inactivos).
          </p>
        </CardContent>
      </Card>

      {links.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm">
              {selected.size} de {links.length} URLs seleccionadas
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={preview}
                disabled={busy !== null || selected.size === 0}
                size="sm"
                className="gap-2"
              >
                {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Vista previa (1-2)
              </Button>
              <Button
                onClick={extract}
                disabled={busy !== null || selected.size === 0}
                size="sm"
                className="gap-2"
              >
                {busy === "extract" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Extraer todo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto space-y-1">
            {links.map((l) => (
              <label
                key={l}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
              >
                <Checkbox
                  checked={selected.has(l)}
                  onCheckedChange={(v) => {
                    const n = new Set(selected);
                    v ? n.add(l) : n.delete(l);
                    setSelected(n);
                  }}
                />
                <span className="truncate text-muted-foreground">{l}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {previewProducts && (() => {
        const stats = aggregateValidation(previewProducts);
        return (
          <Card className="border-primary/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Vista previa validada — {previewProducts.length} producto(s)
                </CardTitle>
                {previewProducts.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[11px] border-primary/40 text-primary bg-primary/10">
                      {stats.ready} listos
                    </Badge>
                    {stats.withErrors > 0 && (
                      <Badge variant="outline" className="text-[11px] border-destructive/50 text-destructive bg-destructive/10">
                        {stats.withErrors} con errores
                      </Badge>
                    )}
                    {stats.withWarnings > 0 && (
                      <Badge variant="outline" className="text-[11px] border-amber-400/40 text-amber-400 bg-amber-400/10">
                        {stats.withWarnings} incompletos
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[11px]">
                      Completitud {stats.avgCompleteness}%
                    </Badge>
                  </div>
                )}
              </div>
              {previewProducts.length > 0 && (stats.missingImage > 0 || stats.missingDescription > 0 || stats.missingPrice > 0) && (
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {stats.missingPrice > 0 && <>⚠️ <strong>{stats.missingPrice}</strong> sin precio · </>}
                    {stats.missingImage > 0 && <>📷 <strong>{stats.missingImage}</strong> sin imagen · </>}
                    {stats.missingDescription > 0 && <>📝 <strong>{stats.missingDescription}</strong> sin descripción</>}
                    {" · "}Continúa con <em>Extraer todo</em> para corregirlos en lote con IA.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {previewProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">
                  No se detectó ningún producto. Cambia de proveedor o activa la IA.
                </p>
              ) : (
                previewProducts.map((it: any, i: number) => (
                  <ProductPreviewCard key={i} item={it} index={i} />
                ))
              )}
            </CardContent>
          </Card>
        );
      })()}

      {products.length > 0 && (() => {
        const stats = aggregateValidation(products);
        const selectedItems = Array.from(selectedP).map((i) => products[i]).filter(Boolean);
        const selectedStats = aggregateValidation(selectedItems);
        return (
          <Card>
            <CardHeader className="pb-3 space-y-3">
              <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm">
                  {selectedP.size} de {products.length} productos a importar
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={autoFillImages}
                    disabled={autoImgBusy || busy !== null}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {autoImgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Auto-imágenes ({stats.missingImage})
                  </Button>
                  <Button
                    onClick={() => autoFillWithAi("all")}
                    disabled={aiBatchBusy || busy !== null || products.length === 0}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                    title="Genera sabores, ingredientes, tipo de evaporador, atributos técnicos y SEO para TODOS los productos antes de guardar"
                  >
                    {aiBatchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Completar metadatos IA (todos)
                  </Button>
                  <Button
                    onClick={() => autoFillWithAi("selected")}
                    disabled={aiBatchBusy || busy !== null || selectedP.size === 0}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {aiBatchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    IA en seleccionados
                  </Button>
                  <Button
                    onClick={importProducts}
                    disabled={busy !== null || selectedP.size === 0 || !canImport || selectedStats.withErrors === selectedItems.length}
                    size="sm"
                    className="gap-2"
                  >
                    {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Importar {selectedStats.ready > 0 ? `(${selectedStats.ready} listos)` : ""}
                  </Button>
                </div>
              </div>

              {/* Batch validation summary */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
                  ✓ {stats.ready} listos
                </Badge>
                {stats.withErrors > 0 && (
                  <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">
                    ✕ {stats.withErrors} bloqueados
                  </Badge>
                )}
                {stats.withWarnings > 0 && (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-400 bg-amber-400/10">
                    ⚠ {stats.withWarnings} incompletos
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  Completitud media: <strong className={stats.avgCompleteness >= 70 ? "text-primary" : stats.avgCompleteness >= 40 ? "text-amber-400" : "text-destructive"}>{stats.avgCompleteness}%</strong>
                </span>
              </div>

              {/* Live AI batch progress */}
              {aiBatchBusy && aiBatchProgress.total > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-primary font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generando metadatos con IA…
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {aiBatchProgress.done}/{aiBatchProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                      style={{ width: `${Math.round((aiBatchProgress.done / aiBatchProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Sabores, ingredientes, tipo de evaporador, atributos técnicos y SEO.
                  </p>
                </div>
              )}
              {stats.withErrors > 0 && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>{stats.withErrors}</strong> producto(s) tienen errores que bloquean la importación
                    (sin nombre o sin precio). Corrígelos manualmente o con <em>Completar IA</em>, o desmárcalos para continuar.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="max-h-[32rem] overflow-auto space-y-2">
              {products.map((it: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <ProductPreviewCard
                    item={it}
                    index={i}
                    selected={selectedP.has(i)}
                    onToggle={(v) => {
                      const n = new Set(selectedP);
                      v ? n.add(i) : n.delete(i);
                      setSelectedP(n);
                    }}
                    onAutoImage={() => autoImageRow(i)}
                    onAutoFillAi={() => autoFillAiRow(i)}
                    onApplyPatch={(patch) => applyRowPatch(i, patch)}
                    brandCatalog={brandCatalog}
                    categoryCatalog={categoryCatalog}
                    imageBusy={rowImageBusy.has(i)}
                    aiBusy={rowAiBusy.has(i)}
                  />
                  <div className="pt-3">
                    <AutoImagePicker
                      query={{ name: it.name, brand: it.brand, category: it.category, gtin: it.gtin }}
                      current={Array.isArray(it.images) ? it.images[0] : it.image_url}
                      onPick={(url) =>
                        setProducts((curr) => {
                          const copy = [...curr];
                          if (copy[i]) copy[i] = { ...copy[i], images: [url, ...(copy[i].images || []).filter((u: string) => u !== url)] };
                          return copy;
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {rlsError && (
        <RlsErrorPanel
          message={rlsError}
          role={role}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
};

export default ProductImporter;

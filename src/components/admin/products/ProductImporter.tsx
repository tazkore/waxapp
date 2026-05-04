import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCanImportProducts } from "@/hooks/useCanImportProducts";
import { insertWithRetry, isRlsError } from "@/lib/insertWithRetry";
import RlsErrorPanel from "./RlsErrorPanel";
import AutoImagePicker from "./AutoImagePicker";
import { validateProductRow } from "@/lib/validateProductRow";
import { norm, type CatalogEntry } from "@/lib/categoryBrandSuggester";
import { normalizeSeoMetadata } from "@/lib/normalizeSeoMetadata";
import ScrapeInputPanel, { type Provider } from "./ScrapeInputPanel";
import StagingTable from "./StagingTable";
import EnrichmentDialog from "./EnrichmentDialog";
import PublishBar from "./PublishBar";
import {
  Loader2,
  Wand2,
  Sparkles,
  ShieldAlert,
  FileText,
  Eye,
  Zap,
} from "lucide-react";

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

  // ------- Input config -------
  const [provider, setProvider] = useState<Provider>("firecrawl");
  const [useAi, setUseAi] = useState(true);

  // ------- Map flow -------
  const [mappedFromUrl, setMappedFromUrl] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  // ------- Staging state -------
  const [products, setProducts] = useState<any[]>([]);
  const [selectedP, setSelectedP] = useState<Set<number>>(new Set());

  // ------- Misc UI state -------
  const [busy, setBusy] = useState<string | null>(null);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [autoImgBusy, setAutoImgBusy] = useState(false);
  const [aiBatchBusy, setAiBatchBusy] = useState(false);
  const [aiBatchProgress, setAiBatchProgress] = useState({ done: 0, total: 0 });
  const [rowImageBusy, setRowImageBusy] = useState<Set<number>>(new Set());
  const [rowAiBusy, setRowAiBusy] = useState<Set<number>>(new Set());
  const currentJobId = useRef<string | null>(null);
  const [brandCatalog, setBrandCatalog] = useState<CatalogEntry[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<CatalogEntry[]>([]);

  // Enrichment dialog
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  // Image picker overlay (per row)
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

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

  /** Patch a single staging row */
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

  const removeRow = (i: number) => {
    setProducts((curr) => curr.filter((_, idx) => idx !== i));
    setSelectedP((prev) => {
      const n = new Set<number>();
      prev.forEach((x) => {
        if (x < i) n.add(x);
        else if (x > i) n.add(x - 1);
      });
      return n;
    });
    toast({ title: "Producto descartado de staging" });
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
        applyRowPatch(i, { images: [img, ...((it.images || []).filter((u: string) => u !== img))] });
        toast({ title: "Imagen encontrada" });
      } else {
        toast({
          title: "Sin resultados",
          description: "Abre el buscador IA para ver más opciones.",
          variant: "destructive",
        });
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
            flavor_profile: copy[i].flavor_profile?.length ? copy[i].flavor_profile : p.flavor_profile,
            ingredients: copy[i].ingredients?.length ? copy[i].ingredients : p.ingredients,
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

  // ------- Domain mapping -------
  const mapDomain = async (url: string) => {
    if (!isHttpUrl(url)) {
      toast({ title: "URL inválida", variant: "destructive" });
      return;
    }
    setBusy("map");
    setMappedFromUrl(url);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-map", {
        body: { url, limit: 100, provider },
      });
      if (error || data?.error) throw new Error(parseFnError(data, error));
      const found: string[] = data.links || [];
      setLinks(found);
      const likely = found.filter((l) =>
        /\/(product|producto|p|item|productos|shop|tienda)[\/-]/i.test(l),
      );
      setSelectedLinks(new Set(likely.length ? likely : found.slice(0, 20)));
      toast({ title: "Sitio mapeado", description: `${found.length} URLs encontradas` });
    } catch (e: any) {
      toast({ title: "Error al mapear", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // ------- Extraction (single / bulk / from map) -------
  const extractUrls = async (urls: string[], busyKey: string) => {
    if (urls.length === 0) {
      toast({ title: "Sin URLs válidas", variant: "destructive" });
      return;
    }
    setBusy(busyKey);
    try {
      const { data: job, error: jobErr } = await supabase
        .from("import_jobs")
        .insert({
          source_url: urls[0],
          status: "pending",
          urls_found: urls.length,
          discovered_urls: urls,
        })
        .select()
        .single();
      if (jobErr) throw jobErr;
      currentJobId.current = job.id;
      onJobsChanged?.();

      const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", {
        body: { urls, provider, use_ai: useAi, job_id: job.id },
      });
      if (error || data?.error) throw new Error(parseFnError(data, error));
      const list: any[] = data.products || [];

      // Append to staging instead of replacing, so multiple bulk runs accumulate
      setProducts((curr) => {
        const merged = [...curr, ...list];
        setSelectedP(new Set(merged.map((_, i) => i)));
        return merged;
      });
      onJobsChanged?.();
      toast({
        title: list.length ? `${list.length} producto(s) en staging` : "Sin productos extraídos",
        description: list.length
          ? "Revisa, enriquece con IA y publica."
          : "Cambia de motor o activa la IA y reintenta.",
        variant: list.length ? "default" : "destructive",
      });
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

  const autoFillWithAi = async (scope: "selected" | "all" = "all") => {
    const indices = scope === "all"
      ? products.map((_, i) => i)
      : Array.from(selectedP);
    if (!indices.length) {
      toast({
        title: scope === "all" ? "No hay productos en staging" : "Selecciona productos primero",
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

  const normalizeSeoBatch = () => {
    if (products.length === 0) {
      toast({ title: "No hay productos para normalizar", variant: "destructive" });
      return;
    }
    let touched = 0;
    const changeSummary: Record<string, number> = {};
    setProducts((curr) => {
      const copy = [...curr];
      for (let i = 0; i < copy.length; i++) {
        const { patch, changes } = normalizeSeoMetadata(copy[i]);
        if (Object.keys(patch).length === 0) continue;
        copy[i] = { ...copy[i], ...patch };
        touched++;
        for (const c of changes) {
          const key = c.split(" ")[0];
          changeSummary[key] = (changeSummary[key] || 0) + 1;
        }
      }
      return copy;
    });
    if (touched === 0) {
      toast({ title: "SEO ya está completo en todos los productos" });
      return;
    }
    const summary = Object.entries(changeSummary).map(([k, n]) => `${k}: ${n}`).join(" · ");
    toast({ title: `SEO normalizado en ${touched} productos`, description: summary });
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
    toast({ title: "Validando productos…" });
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

      toast({ title: `Insertando ${rows.length} productos…` });
      const { error, attempts, retried } = await insertWithRetry("products", rows);
      if (error) {
        const msg = error.message || String(error);
        if (isRlsError(error)) {
          setRlsError(msg);
          await logFailureToJob(`RLS denied (${attempts} attempts): ${msg}`);
          toast({ title: "Sin permisos para importar", description: "Revisa el panel de error.", variant: "destructive" });
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
        title: `✅ ${rows.length} productos publicados`,
        description: `Quedan como borradores en el catálogo${retried ? ` (recuperado tras ${attempts} intentos)` : ""}.`,
      });
      setProducts([]);
      setSelectedP(new Set());
      setLinks([]);
      setSelectedLinks(new Set());
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

  // ============ UI ============
  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Scraping & Enrichment Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Extrae productos desde cualquier URL, enriquece con IA y publica en tu inventario.
          </p>
        </div>
      </div>

      {!roleLoading && !canImport && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permisos insuficientes</AlertTitle>
          <AlertDescription className="text-sm">
            Tu rol actual <strong className="font-mono">{role || "ninguno"}</strong> no puede insertar productos.
            Puedes mapear y extraer, pero la publicación requiere rol{" "}
            <strong>admin</strong>, <strong>super_admin</strong> o <strong>moderator</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Input Panel (tabs) */}
      <ScrapeInputPanel
        provider={provider}
        onProviderChange={setProvider}
        useAi={useAi}
        onUseAiChange={setUseAi}
        busyKey={busy}
        onExtractSingle={(u) => extractUrls([u], "extract-single")}
        onExtractBulk={(urls) => extractUrls(urls, "extract-bulk")}
        onMapDomain={mapDomain}
      />

      {/* Domain map results */}
      {links.length > 0 && (
        <Card className="border-white/5">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
            <CardTitle className="text-sm">
              {selectedLinks.size} de {links.length} URLs seleccionadas{" "}
              <span className="text-muted-foreground font-normal text-xs">de {mappedFromUrl}</span>
            </CardTitle>
            <Button
              onClick={() => extractUrls(Array.from(selectedLinks), "extract-bulk")}
              disabled={busy !== null || selectedLinks.size === 0}
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy === "extract-bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Extraer {selectedLinks.size} URLs
            </Button>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto space-y-1">
            {links.map((l) => (
              <label
                key={l}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
              >
                <Checkbox
                  checked={selectedLinks.has(l)}
                  onCheckedChange={(v) => {
                    const n = new Set(selectedLinks);
                    v ? n.add(l) : n.delete(l);
                    setSelectedLinks(n);
                  }}
                />
                <span className="truncate text-muted-foreground">{l}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 2. Staging Table */}
      {products.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Staging — {products.length} producto(s) extraído(s)
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => autoFillWithAi("all")}
                disabled={aiBatchBusy || busy !== null || products.length === 0}
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                title="Genera nombres limpios, SEO y atributos para todos los productos"
              >
                {aiBatchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                ✨ Procesar todo con IA
              </Button>
              <Button
                onClick={autoFillImages}
                disabled={autoImgBusy || busy !== null}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {autoImgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Auto-imágenes
              </Button>
              <Button
                onClick={normalizeSeoBatch}
                disabled={busy !== null || aiBatchBusy || products.length === 0}
                size="sm"
                variant="outline"
                className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
              >
                <FileText className="h-4 w-4" /> Normalizar SEO
              </Button>
            </div>
          </div>

          {/* Live AI batch progress */}
          {aiBatchBusy && aiBatchProgress.total > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-primary font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Procesando con IA…
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
            </div>
          )}

          <StagingTable
            products={products}
            selectedIdx={selectedP}
            rowImageBusy={rowImageBusy}
            rowAiBusy={rowAiBusy}
            onToggle={(i, v) => {
              const n = new Set(selectedP);
              v ? n.add(i) : n.delete(i);
              setSelectedP(n);
            }}
            onToggleAll={(v) => {
              if (v) setSelectedP(new Set(products.map((_, i) => i)));
              else setSelectedP(new Set());
            }}
            onAutoImage={autoImageRow}
            onPickImage={(i) => setPickerIdx(i)}
            onEnrich={(i) => setEditingIdx(i)}
            onRemove={removeRow}
          />

          {/* Image picker dialog, opened via "Buscador IA" overlay or row action */}
          {pickerIdx != null && products[pickerIdx] && (
            <AutoImagePicker
              key={`picker-${pickerIdx}`}
              hideTrigger
              defaultOpen
              query={{
                name: products[pickerIdx].name,
                brand: products[pickerIdx].brand,
                category: products[pickerIdx].category,
                gtin: products[pickerIdx].gtin,
              }}
              current={Array.isArray(products[pickerIdx].images) ? products[pickerIdx].images[0] : products[pickerIdx].image_url}
              onPick={(url) => {
                applyRowPatch(pickerIdx, {
                  images: [url, ...(((products[pickerIdx].images) || []).filter((u: string) => u !== url))],
                });
                setPickerIdx(null);
              }}
              onClose={() => setPickerIdx(null)}
            />
          )}
        </div>
      )}

      {/* Empty staging hint */}
      {products.length === 0 && links.length === 0 && (
        <Card className="border-dashed border-white/10">
          <CardContent className="py-10 text-center text-muted-foreground space-y-2">
            <Wand2 className="h-8 w-8 mx-auto text-primary/60" />
            <p className="text-sm">Pega una URL individual o varias para extraer datos brutos.</p>
            <p className="text-xs">Los productos extraídos quedarán aquí hasta que los apruebes para inventario.</p>
          </CardContent>
        </Card>
      )}

      {/* Enrichment dialog */}
      <EnrichmentDialog
        open={editingIdx != null}
        onOpenChange={(v) => !v && setEditingIdx(null)}
        product={editingIdx != null ? products[editingIdx] : null}
        index={editingIdx}
        onPatch={applyRowPatch}
        onRunAi={async (i) => { await autoFillAiRow(i); }}
        aiBusy={editingIdx != null && rowAiBusy.has(editingIdx)}
      />

      {/* RLS error */}
      {rlsError && (
        <RlsErrorPanel message={rlsError} role={role} isSuperAdmin={isSuperAdmin} />
      )}

      {/* Sticky publish bar */}
      <PublishBar
        products={products}
        selectedIdx={selectedP}
        busy={busy === "import"}
        canImport={canImport}
        onPublish={importProducts}
      />
    </div>
  );
};


export default ProductImporter;

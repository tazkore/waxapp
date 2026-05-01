import { useRef, useState } from "react";
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
import {
  Loader2,
  Globe,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  ImageOff,
  ShieldAlert,
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
  const [rowImageBusy, setRowImageBusy] = useState<Set<number>>(new Set());
  const [rowAiBusy, setRowAiBusy] = useState<Set<number>>(new Set());
  const currentJobId = useRef<string | null>(null);

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

  const autoFillWithAi = async () => {
    const indices = Array.from(selectedP);
    if (!indices.length) {
      toast({ title: "Selecciona productos primero", variant: "destructive" });
      return;
    }
    setAiBatchBusy(true);
    let filled = 0;
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
            filled++;
          }
        } catch (e) {
          console.error("autofill err", e);
        }
      }
    });
    await Promise.all(workers);
    setAiBatchBusy(false);
    toast({
      title: "IA completada",
      description: `${filled}/${indices.length} productos enriquecidos`,
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

      {previewProducts && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Vista previa — {previewProducts.length} producto(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {previewProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No se detectó ningún producto. Cambia de proveedor o activa la IA.
              </p>
            ) : (
              previewProducts.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  {it.images?.[0] && (
                    <img
                      src={it.images[0]}
                      alt=""
                      className="h-12 w-12 rounded object-cover bg-muted"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ${it.price ?? "?"} · {it.category || "Sin categoría"}{" "}
                      {it.brand ? `· ${it.brand}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">OK</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
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
                Auto-buscar imágenes
              </Button>
              <Button
                onClick={autoFillWithAi}
                disabled={aiBatchBusy || busy !== null || selectedP.size === 0}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {aiBatchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Completar con IA
              </Button>
              <Button
                onClick={importProducts}
                disabled={busy !== null || selectedP.size === 0 || !canImport}
                size="sm"
                className="gap-2"
              >
                {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Importar al catálogo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-auto space-y-2">
            {products.map((it: any, i: number) => {
              const img = Array.isArray(it.images) ? it.images[0] : it.image_url;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedP.has(i)}
                    onCheckedChange={(v) => {
                      const n = new Set(selectedP);
                      v ? n.add(i) : n.delete(i);
                      setSelectedP(n);
                    }}
                  />
                  {img ? (
                    <img src={img} alt="" className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                      <ImageOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ${it.price ?? "?"} · {it.category || "Sin categoría"}
                      {it.brand ? ` · ${it.brand}` : ""}
                    </p>
                    {!img && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/50 text-amber-500">
                        Sin imagen
                      </Badge>
                    )}
                  </div>
                  <AutoImagePicker
                    query={{ name: it.name, brand: it.brand, category: it.category, gtin: it.gtin }}
                    current={img}
                    onPick={(url) =>
                      setProducts((curr) => {
                        const copy = [...curr];
                        if (copy[i]) copy[i] = { ...copy[i], images: [url, ...(copy[i].images || []).filter((u: string) => u !== url)] };
                        return copy;
                      })
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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

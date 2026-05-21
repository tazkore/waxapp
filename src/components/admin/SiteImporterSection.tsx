import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scrapeProductsInBatches } from "@/lib/scrapeInBatches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Wand2, Download, Palette, AlertCircle, Store, FileText, FileSpreadsheet, ScanSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DuplicatesReviewDialog from "./DuplicatesReviewDialog";
import {
  downloadImportReportCSV,
  downloadImportReportPDF,
  type ImportDuplicate,
  type ImportReportData,
} from "@/lib/exportImportReport";

type Provider = "firecrawl" | "jina" | "scrapingbee";

type Step = "url" | "mapped" | "extracted" | "store" | "done";

interface ExtractedProduct {
  source_url: string;
  name: string;
  description?: string;
  price?: number;
  sku?: string;
  category?: string;
  images?: string[];
  is_product_page?: boolean;
}

const SiteImporterSection = () => {
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [branding, setBranding] = useState<any>(null);
  const [provider, setProvider] = useState<Provider>("jina");
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");

  // Dry-run + duplicates flow
  const [dryRun, setDryRun] = useState<{
    would_create: number;
    would_skip: number;
    duplicates: ImportDuplicate[];
  } | null>(null);
  const [showDupes, setShowDupes] = useState(false);
  const [lastReport, setLastReport] = useState<ImportReportData | null>(null);

  const { toast } = useToast();

  const fail = (e: any, ctx: string) => {
    console.error(ctx, e);
    toast({ title: ctx, description: e?.message || String(e), variant: "destructive" });
  };

  const startMap = async () => {
    if (!url.trim()) return;
    setBusy("map");
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-map", { body: { url, limit: 100, provider } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setJobId(data.job_id);
      setLinks(data.links || []);
      // pre-select likely product URLs
      const likely = (data.links || []).filter((l: string) =>
        /\/(product|producto|p|item|productos|shop|tienda)[/-]/i.test(l)
      );
      setSelectedLinks(new Set(likely.length ? likely : (data.links || []).slice(0, 20)));
      setStep("mapped");
      toast({ title: "Sitio mapeado", description: `${data.links?.length || 0} URLs encontradas` });
    } catch (e: any) {
      fail(e, "Error al mapear sitio");
    } finally {
      setBusy(null);
    }
  };

  const fetchBranding = async () => {
    setBusy("branding");
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-import-branding", { body: { url, provider } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBranding(data.branding);
      toast({ title: "Branding extraído" });
    } catch (e: any) {
      fail(e, "Error al extraer branding");
    } finally {
      setBusy(null);
    }
  };

  const applyBranding = async () => {
    if (!branding) return;
    try {
      const hex = branding.colors?.primary;
      // very rough hex->hsl skipping; we just store hex inside, keep current if missing
      const update: any = {};
      if (branding.fonts?.[0]?.family) update.font_heading = branding.fonts[0].family;
      if (branding.fonts?.[1]?.family || branding.fonts?.[0]?.family) update.font_body = branding.fonts?.[1]?.family || branding.fonts[0].family;
      if (branding.images?.logo) update.logo_url = branding.images.logo;
      if (branding.images?.favicon) update.favicon_url = branding.images.favicon;
      const { data: existing } = await supabase.from("theme_settings").select("id").eq("is_active", true).maybeSingle();
      if (existing?.id) {
        await supabase.from("theme_settings").update(update).eq("id", existing.id);
      }
      toast({ title: "Branding aplicado", description: `Logo, favicon y fuentes actualizados${hex ? ` (color base: ${hex})` : ""}` });
    } catch (e: any) {
      fail(e, "Error aplicando branding");
    }
  };

  const scrapeProducts = async () => {
    if (!jobId || selectedLinks.size === 0) return;
    setBusy("scrape");
    try {
      const { products } = await scrapeProductsInBatches({
        job_id: jobId,
        urls: Array.from(selectedLinks),
        provider,
        onProgress: (done, total) => {
          if (total > 30) toast({ title: `Extrayendo… ${done}/${total}` });
        },
      });
      setProducts(products);
      setSelectedProducts(new Set(products.map((_: any, i: number) => i)));
      setStep("extracted");
      toast({ title: "Productos extraídos", description: `${products.length} productos detectados` });
    } catch (e: any) {
      fail(e, "Error al extraer productos");
    } finally {
      setBusy(null);
    }
  };

  /** Step 1: dry-run analysis */
  const analyzeDuplicates = async () => {
    if (selectedProducts.size === 0) return;
    setBusy("analyze");
    setDryRun(null);
    try {
      const list = Array.from(selectedProducts).map((i) => products[i]);
      const { data, error } = await supabase.functions.invoke("import-products", {
        body: { job_id: jobId, products: list, dry_run: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const duplicates = (data?.duplicates ?? []) as ImportDuplicate[];
      setDryRun({
        would_create: data?.would_create ?? 0,
        would_skip: duplicates.length,
        duplicates,
      });
      if (duplicates.length === 0) {
        toast({
          title: "Sin duplicados",
          description: `Listo para importar ${data?.would_create ?? 0} productos nuevos.`,
        });
      } else {
        setShowDupes(true);
      }
    } catch (e: any) {
      fail(e, "Error al analizar duplicados");
    } finally {
      setBusy(null);
    }
  };

  /** Step 2: real import (after dry-run, with optional overwrite list) */
  const runImport = async (overwriteIndexes: number[] = []) => {
    if (!jobId || selectedProducts.size === 0) return;
    setBusy("import");
    setShowDupes(false);
    try {
      const list = Array.from(selectedProducts).map((i) => products[i]);
      const { data, error } = await supabase.functions.invoke("import-products", {
        body: {
          job_id: jobId,
          products: list,
          overwrite_indexes: overwriteIndexes,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const report: ImportReportData = {
        imported: data?.imported ?? 0,
        updated: data?.updated ?? 0,
        errors: data?.errors ?? [],
        duplicates: data?.duplicates ?? [],
        product_ids: data?.product_ids ?? [],
        source_url: url,
        origin_domain: typeof window !== "undefined" ? window.location.hostname : undefined,
        products: list,
      };
      setLastReport(report);
      setImportedIds(report.product_ids);
      toast({
        title: "Importación completa",
        description: `${report.imported} nuevos · ${report.updated} actualizados · ${report.duplicates.length} omitidos`,
      });

      try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, "").split(".")[0];
        setStoreName(host.charAt(0).toUpperCase() + host.slice(1));
        setStoreSlug(host.toLowerCase());
      } catch {}
      setStep("store");
    } catch (e: any) {
      fail(e, "Error al importar");
    } finally {
      setBusy(null);
    }
  };
  const createSubStore = async () => {
    if (!storeName.trim() || !storeSlug.trim()) return;
    setBusy("substore");
    try {
      // 1. Find or create brand
      let brand_id: string | null = null;
      const { data: existingBrand } = await supabase.from("brands").select("id").eq("slug", storeSlug).maybeSingle();
      if (existingBrand?.id) {
        brand_id = existingBrand.id;
      } else {
        const { data: newBrand, error: bErr } = await supabase
          .from("brands")
          .insert({ name: storeName, slug: storeSlug, logo_url: branding?.images?.logo ?? null, is_active: true })
          .select("id")
          .single();
        if (bErr) throw bErr;
        brand_id = newBrand.id;
      }

      // 2. Create sub-store with branding
      const subPayload: any = {
        name: storeName,
        slug: storeSlug,
        brand_id,
        is_active: true,
        logo_url: branding?.images?.logo ?? null,
        favicon_url: branding?.images?.favicon ?? null,
        color_primary: branding?.colors?.primary ?? null,
        color_secondary: branding?.colors?.secondary ?? null,
        color_accent: branding?.colors?.accent ?? null,
        font_heading: branding?.fonts?.[0]?.family ?? null,
        font_body: branding?.fonts?.[1]?.family ?? branding?.fonts?.[0]?.family ?? null,
        hero_headline: storeName,
      };
      const { data: subStore, error: sErr } = await supabase.from("sub_stores").insert(subPayload).select("id").single();
      if (sErr) throw sErr;

      // 3. Assign imported products
      if (importedIds.length > 0) {
        await supabase.from("products").update({ sub_store_id: subStore.id, brand_id }).in("id", importedIds);
      }

      // 4. Register temporary domain + external pending
      try {
        const externalHost = new URL(url).hostname.replace(/^www\./, "");
        await (supabase as any).from("domains").insert([
          { hostname: externalHost, brand_id, sub_store_id: subStore.id, status: "pending", ssl_status: "pending", display_name: storeName, is_primary: true },
          { hostname: `${storeSlug}.preview.waxapp.mx`, brand_id, sub_store_id: subStore.id, status: "active", ssl_status: "active", display_name: `${storeName} (temporal)`, notes: `Ruta funcional: /s/${storeSlug}` },
        ]);
      } catch (e) {
        console.warn("domain insert", e);
      }

      toast({ title: "Sub-tienda creada", description: `${storeName} con ${importedIds.length} productos` });
      setStep("done");
    } catch (e: any) {
      fail(e, "Error al crear sub-tienda");
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setStep("url");
    setUrl("");
    setJobId(null);
    setLinks([]);
    setSelectedLinks(new Set());
    setProducts([]);
    setSelectedProducts(new Set());
    setBranding(null);
    setImportedIds([]);
    setStoreName("");
    setStoreSlug("");
    setDryRun(null);
    setLastReport(null);
    setShowDupes(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importar Sitio</h2>
        <p className="text-sm text-muted-foreground">
          Migra productos, imágenes y branding de cualquier sitio web usando Firecrawl + IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> 1. URL del sitio origen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)} disabled={step !== "url"}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="firecrawl">Firecrawl</SelectItem>
                <SelectItem value="jina">Jina Reader</SelectItem>
                <SelectItem value="scrapingbee">ScrapingBee</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="https://mi-tienda-anterior.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={step !== "url"}
            />
            <Button onClick={startMap} disabled={!url || busy !== null || step !== "url"}>
              {busy === "map" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mapear"}
            </Button>
            <Button variant="outline" onClick={fetchBranding} disabled={!url || busy !== null}>
              {busy === "branding" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Palette className="h-4 w-4 mr-1" />Branding</>}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Proveedores: Firecrawl (calidad alta), Jina Reader (gratis con rate-limit), ScrapingBee (JS rendering).
          </p>
          {jobId && <p className="text-xs text-muted-foreground">Job: <code>{jobId.slice(0, 8)}…</code></p>}
        </CardContent>
      </Card>

      {branding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" /> Branding detectado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(branding.colors || {}).map(([k, v]: any) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <div className="h-5 w-5 rounded border border-border" style={{ background: v }} />
                  {k}: <code>{v}</code>
                </div>
              ))}
            </div>
            {branding.fonts?.length > 0 && (
              <p className="text-xs">Fuentes: {branding.fonts.map((f: any) => f.family).join(", ")}</p>
            )}
            {branding.images?.logo && (
              <img src={branding.images.logo} alt="logo" className="h-12 object-contain bg-muted p-2 rounded" />
            )}
            <Button size="sm" onClick={applyBranding}>Aplicar a mi tema</Button>
          </CardContent>
        </Card>
      )}

      {step !== "url" && links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>2. URLs encontradas ({links.length})</span>
              <Badge variant="outline">{selectedLinks.size} seleccionadas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 overflow-y-auto border border-border rounded p-2 space-y-1">
              {links.map((l) => (
                <label key={l} className="flex items-center gap-2 text-xs hover:bg-muted/50 px-1 py-0.5 rounded cursor-pointer">
                  <Checkbox
                    checked={selectedLinks.has(l)}
                    onCheckedChange={(v) => {
                      const next = new Set(selectedLinks);
                      v ? next.add(l) : next.delete(l);
                      setSelectedLinks(next);
                    }}
                  />
                  <span className="truncate">{l}</span>
                </label>
              ))}
            </div>
            <Button onClick={scrapeProducts} disabled={selectedLinks.size === 0 || busy !== null}>
              {busy === "scrape" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Extraer productos con IA ({selectedLinks.size})
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Máx. 30 URLs por extracción.
            </p>
          </CardContent>
        </Card>
      )}

      {step === "extracted" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Productos detectados ({products.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 && <p className="text-sm text-muted-foreground">No se detectaron productos en esas URLs.</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border border-border rounded">
                  <Checkbox
                    checked={selectedProducts.has(i)}
                    onCheckedChange={(v) => {
                      const next = new Set(selectedProducts);
                      v ? next.add(i) : next.delete(i);
                      setSelectedProducts(next);
                    }}
                  />
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="h-12 w-12 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ${p.price || 0} · {p.sku || "sin SKU"} · {p.category || "sin categoría"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {products.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                {/* Dry-run summary */}
                {dryRun && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Análisis:</span>
                    <Badge className="bg-primary/15 text-primary border-primary/40 hover:bg-primary/15">
                      {dryRun.would_create} se crearán
                    </Badge>
                    <Badge variant="outline" className="border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))]">
                      {dryRun.would_skip} duplicados
                    </Badge>
                    {dryRun.duplicates.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-7"
                        onClick={() => setShowDupes(true)}
                      >
                        Revisar duplicados
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={analyzeDuplicates}
                    disabled={selectedProducts.size === 0 || busy !== null}
                  >
                    {busy === "analyze" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ScanSearch className="h-4 w-4 mr-2" />
                    )}
                    Analizar ({selectedProducts.size})
                  </Button>
                  <Button
                    onClick={() => runImport([])}
                    disabled={selectedProducts.size === 0 || busy !== null}
                  >
                    {busy === "import" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Importar {selectedProducts.size} productos
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tip: usa <strong>Analizar</strong> para ver cuántos productos se crearán o duplicarán antes de importar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "store" && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" /> 4. Crear sub-tienda con todo lo importado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Se creará una marca y una sub-tienda con su propio tema, accesible en <code>/s/{storeSlug || "slug"}</code>.
              Los <strong>{importedIds.length}</strong> productos importados quedarán asignados automáticamente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre de la tienda</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Cannesh" />
              </div>
              <div>
                <Label className="text-xs">Slug (URL)</Label>
                <Input
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="cannesh"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createSubStore} disabled={!storeName || !storeSlug || busy !== null}>
                {busy === "substore" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
                Crear sub-tienda
              </Button>
              <Button variant="ghost" onClick={() => setStep("done")}>Saltar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(step === "done" || (step === "store" && lastReport)) && lastReport && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Reporte de importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Creados</p>
                <p className="text-2xl font-bold text-primary">{lastReport.imported}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Actualizados</p>
                <p className="text-2xl font-bold text-primary">{lastReport.updated}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Omitidos</p>
                <p className="text-2xl font-bold text-[hsl(var(--accent))]">{lastReport.duplicates.length}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Errores</p>
                <p className="text-2xl font-bold text-destructive">{lastReport.errors.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadImportReportCSV(lastReport)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Descargar CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadImportReportPDF(lastReport)}>
                <FileText className="h-4 w-4 mr-2" /> Descargar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="border-primary">
          <CardContent className="py-6 text-center space-y-3">
            <p className="font-medium">¡Importación completada!</p>
            <p className="text-sm text-muted-foreground">
              Los productos quedaron como <strong>inactivos</strong>. Revísalos en Inventario antes de publicar.
              {storeSlug && <> La sub-tienda está disponible en <a href={`/s/${storeSlug}`} target="_blank" rel="noreferrer" className="text-primary underline">/s/{storeSlug}</a>.</>}
            </p>
            <Button variant="outline" onClick={reset}>Importar otro sitio</Button>
          </CardContent>
        </Card>
      )}

      <DuplicatesReviewDialog
        open={showDupes}
        onOpenChange={setShowDupes}
        duplicates={dryRun?.duplicates ?? []}
        loading={busy === "import"}
        onApply={(idx) => runImport(idx)}
      />
    </div>
  );
};

export default SiteImporterSection;

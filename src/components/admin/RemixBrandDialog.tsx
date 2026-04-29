import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GitBranch, Wand2, Palette, ExternalLink, History, RotateCcw, Save, UploadCloud, Sparkles, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BrandLite { id: string; name: string; slug: string; logo_url: string | null; description: string | null; website: string | null }
interface Props { open: boolean; onClose: () => void; brand: BrandLite | null; onCreated?: () => void }

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

const SNAPSHOT_FIELDS = [
  "tagline","description","logo_url","favicon_url","og_image_url",
  "hero_headline","hero_subtitle","hero_image_url",
  "color_primary","color_secondary","color_background","color_foreground","color_accent",
  "font_heading","font_body",
] as const;

type Snapshot = Partial<Record<(typeof SNAPSHOT_FIELDS)[number], string>> & { name?: string; slug?: string };

const DEFAULT_SNAPSHOT: Snapshot = {
  color_primary: "145 100% 45%", color_secondary: "40 100% 50%",
  color_background: "0 0% 4%", color_foreground: "240 5% 96%", color_accent: "0 0% 15%",
  font_heading: "Space Grotesk", font_body: "Inter",
};

const RemixBrandDialog = ({ open, onClose, brand, onCreated }: Props) => {
  const [tab, setTab] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [subStore, setSubStore] = useState<any>(null);
  const [draft, setDraft] = useState<Snapshot>(DEFAULT_SNAPSHOT);
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [versions, setVersions] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<Partial<Snapshot> | null>(null);
  const [acceptedAi, setAcceptedAi] = useState<Record<string, boolean>>({});
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState<Record<string, string>>({}); // kind -> public_url
  const [sourceHtml, setSourceHtml] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadSubStore = useCallback(async () => {
    if (!brand) return;
    const { data: ss } = await supabase.from("sub_stores").select("*").eq("brand_id", brand.id).maybeSingle();
    if (ss) {
      setSubStore(ss);
      setStoreName(ss.name);
      setStoreSlug(ss.slug);
      const base: Snapshot = { ...DEFAULT_SNAPSHOT };
      SNAPSHOT_FIELDS.forEach((k) => { if ((ss as any)[k] != null) (base as any)[k] = (ss as any)[k]; });
      setDraft(ss.draft_snapshot ?? base);
      setSourceHtml(ss.source_html_excerpt ?? null);
      setDirty(!!ss.draft_snapshot);
      const { data: vs } = await supabase.from("sub_store_versions").select("*").eq("sub_store_id", ss.id).order("version_number", { ascending: false });
      setVersions(vs ?? []);
    } else {
      setSubStore(null);
      setStoreName(brand.name);
      setStoreSlug(brand.slug);
      setDraft({ ...DEFAULT_SNAPSHOT, hero_headline: brand.name, description: brand.description ?? "" });
      setVersions([]);
      setSourceHtml(null);
      setDirty(false);
    }
  }, [brand]);

  useEffect(() => { if (open && brand) { setTab("editor"); setAiSuggestion(null); setAcceptedAi({}); setGalleryUrls([]); setDownloaded({}); loadSubStore(); } }, [open, brand, loadSubStore]);

  const updateField = (k: keyof Snapshot, v: string) => { setDraft((d) => ({ ...d, [k]: v })); setDirty(true); };

  // Initial create + import (only when no sub_store yet)
  const importAndCreate = async () => {
    if (!brand) return;
    setImportLoading(true);
    try {
      let theme: any = null;
      if (brand.website) {
        const { data, error } = await supabase.functions.invoke("firecrawl-import-theme", { body: { url: brand.website } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        theme = data;
      }
      const initial: Snapshot = { ...DEFAULT_SNAPSHOT };
      if (theme) {
        SNAPSHOT_FIELDS.forEach((k) => { if (theme[k]) (initial as any)[k] = theme[k]; });
        if (theme.hero_headline) initial.hero_headline = theme.hero_headline;
        if (theme.hero_subtitle) initial.hero_subtitle = theme.hero_subtitle;
        if (theme.tagline) initial.tagline = theme.tagline;
      }
      initial.hero_headline = initial.hero_headline ?? brand.name;
      initial.description = initial.description ?? brand.description ?? "";

      const { data: u } = await supabase.auth.getUser();
      const flat: any = { brand_id: brand.id, name: brand.name, slug: slugify(brand.slug), is_active: true, created_by: u.user?.id, source_template: brand.website ?? "main_store", source_html_excerpt: theme?.source_html_excerpt ?? null, logo_url: brand.logo_url };
      SNAPSHOT_FIELDS.forEach((k) => { if (initial[k] != null) flat[k] = initial[k]; });
      const { data: ss, error: insErr } = await supabase.from("sub_stores").insert(flat).select().single();
      if (insErr) throw insErr;

      // Create version #1 = original_template, mark as published
      const { data: v1, error: vErr } = await supabase.from("sub_store_versions").insert({
        sub_store_id: ss.id, version_number: 1, label: "Plantilla original (importada)",
        source: "original_template", snapshot: { ...initial, name: ss.name, slug: ss.slug },
        created_by: u.user?.id, is_published: true,
      }).select().single();
      if (vErr) throw vErr;

      await supabase.from("sub_stores").update({ original_version_id: v1.id }).eq("id", ss.id);
      if (theme?.gallery_urls) setGalleryUrls(theme.gallery_urls);
      toast.success("Sub-tienda creada con plantilla original guardada");
      await loadSubStore();
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message ?? "Error importando");
    } finally {
      setImportLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!subStore) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("sub_stores").update({ draft_snapshot: { ...draft, name: storeName, slug: storeSlug } }).eq("id", subStore.id);
      if (error) throw error;
      toast.success("Borrador guardado");
      setDirty(true);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const publish = async () => {
    if (!subStore) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const nextNum = (versions[0]?.version_number ?? 0) + 1;
      const snapshot = { ...draft, name: storeName, slug: storeSlug };
      const { error } = await supabase.from("sub_store_versions").insert({
        sub_store_id: subStore.id, version_number: nextNum, label: `Versión ${nextNum}`,
        source: "manual_edit", snapshot, created_by: u.user?.id, is_published: true,
      });
      if (error) throw error;
      // Slug/name update + clear draft
      await supabase.from("sub_stores").update({ name: storeName, slug: slugify(storeSlug), draft_snapshot: null }).eq("id", subStore.id);
      toast.success(`Versión ${nextNum} publicada`);
      setDirty(false);
      await loadSubStore();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const restoreOriginal = async () => {
    if (!subStore?.original_version_id) { toast.error("Sin plantilla original"); return; }
    const original = versions.find((v) => v.id === subStore.original_version_id);
    if (!original) { toast.error("Versión original no encontrada"); return; }
    setDraft({ ...DEFAULT_SNAPSHOT, ...original.snapshot });
    setDirty(true);
    toast.success("Plantilla original cargada en el borrador. Revisa y publica para aplicar.");
    setTab("editor");
  };

  const restoreVersion = async (v: any) => {
    setDraft({ ...DEFAULT_SNAPSHOT, ...v.snapshot });
    setDirty(true);
    toast.success(`Versión ${v.version_number} cargada en el borrador`);
    setTab("editor");
  };

  const publishExisting = async (v: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("sub_store_versions").update({ is_published: true }).eq("id", v.id);
      if (error) throw error;
      toast.success(`Versión ${v.version_number} publicada`);
      await loadSubStore();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const enhanceCopy = async () => {
    if (!subStore) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-substore-copy", {
        body: { snapshot: draft, source_html_excerpt: sourceHtml, brand_name: storeName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSuggestion(data);
      const acc: Record<string, boolean> = {};
      Object.keys(data).forEach((k) => { if (k !== "seo_meta_title" && k !== "seo_meta_description" && k !== "cta_primary" && k !== "cta_secondary") acc[k] = true; });
      setAcceptedAi(acc);
      toast.success("Sugerencias IA listas. Revisa y acepta los cambios.");
    } catch (e: any) { toast.error(e.message); } finally { setAiLoading(false); }
  };

  const applyAi = () => {
    if (!aiSuggestion) return;
    const next = { ...draft };
    Object.entries(aiSuggestion).forEach(([k, v]) => {
      if (acceptedAi[k] && v && (SNAPSHOT_FIELDS as readonly string[]).includes(k)) (next as any)[k] = v;
    });
    setDraft(next);
    setDirty(true);
    setAiSuggestion(null);
    toast.success("Cambios IA aplicados al borrador. No olvides publicar.");
  };

  const downloadAssets = async () => {
    if (!subStore) return;
    setImgLoading(true);
    try {
      const assets: { kind: string; url: string }[] = [];
      if (draft.logo_url?.startsWith("http")) assets.push({ kind: "logo", url: draft.logo_url });
      if (draft.favicon_url?.startsWith("http")) assets.push({ kind: "favicon", url: draft.favicon_url });
      if (draft.og_image_url?.startsWith("http")) assets.push({ kind: "og", url: draft.og_image_url });
      if (draft.hero_image_url?.startsWith("http")) assets.push({ kind: "hero", url: draft.hero_image_url });
      galleryUrls.forEach((u, i) => assets.push({ kind: `gallery-${i}`, url: u }));
      if (assets.length === 0) { toast.info("No hay imágenes externas para importar"); return; }
      const { data, error } = await supabase.functions.invoke("download-substore-assets", {
        body: { sub_store_slug: storeSlug || subStore.slug, assets },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const map: Record<string, string> = {};
      const next = { ...draft };
      (data.results ?? []).forEach((r: any) => {
        if (r.public_url) {
          map[r.kind] = r.public_url;
          if (r.kind === "logo") next.logo_url = r.public_url;
          if (r.kind === "favicon") next.favicon_url = r.public_url;
          if (r.kind === "og") next.og_image_url = r.public_url;
          if (r.kind === "hero") next.hero_image_url = r.public_url;
        }
      });
      setDownloaded(map);
      setDraft(next);
      setDirty(true);
      toast.success(`${Object.keys(map).length} imágenes guardadas en almacenamiento`);
    } catch (e: any) { toast.error(e.message); } finally { setImgLoading(false); }
  };

  if (!brand) return null;

  const hasStore = !!subStore;
  const publishedNum = versions.find((v) => v.is_published)?.version_number;
  const originalId = subStore?.original_version_id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <GitBranch className="h-5 w-5 text-primary" />
            Remix: {brand.name}
            {hasStore && publishedNum && <Badge variant="outline" className="text-xs">Publicada v{publishedNum}</Badge>}
            {dirty && <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/40">Borrador sin publicar</Badge>}
          </DialogTitle>
          <DialogDescription>
            Sub-tienda en <code className="text-xs">/s/{storeSlug || brand.slug}</code> · Cambios se guardan como borrador hasta que publiques.
          </DialogDescription>
        </DialogHeader>

        {!hasStore ? (
          <div className="space-y-4 py-6">
            <Card><CardContent className="p-6 text-center space-y-3">
              <Wand2 className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm">Aún no existe sub-tienda para esta marca. Vamos a importar branding desde {brand.website ? <span className="font-medium">{brand.website}</span> : "una plantilla por defecto"} y guardarlo como <strong>plantilla original</strong>.</p>
              <Button onClick={importAndCreate} disabled={importLoading}>
                {importLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Crear con plantilla original
              </Button>
            </CardContent></Card>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="editor"><Palette className="h-3 w-3 mr-1" />Editor</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles className="h-3 w-3 mr-1" />Mejorar con IA</TabsTrigger>
              <TabsTrigger value="history"><History className="h-3 w-3 mr-1" />Historial ({versions.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-3">
              <TabsContent value="editor" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label><Input value={storeName} onChange={(e) => { setStoreName(e.target.value); setDirty(true); }} /></div>
                  <div><Label>Slug</Label><Input value={storeSlug} onChange={(e) => { setStoreSlug(slugify(e.target.value)); setDirty(true); }} /></div>
                </div>
                <div><Label>Tagline</Label><Input value={draft.tagline ?? ""} onChange={(e) => updateField("tagline", e.target.value)} /></div>
                <div><Label>Descripción</Label><Textarea rows={2} value={draft.description ?? ""} onChange={(e) => updateField("description", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Hero headline</Label><Input value={draft.hero_headline ?? ""} onChange={(e) => updateField("hero_headline", e.target.value)} /></div>
                  <div><Label>Hero subtítulo</Label><Input value={draft.hero_subtitle ?? ""} onChange={(e) => updateField("hero_subtitle", e.target.value)} /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Palette className="h-3 w-3" />Paleta HSL</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
                    {[{k:"color_primary",l:"Primario"},{k:"color_secondary",l:"Secundario"},{k:"color_background",l:"Fondo"},{k:"color_foreground",l:"Texto"},{k:"color_accent",l:"Acento"}].map(({k,l}) => (
                      <div key={k} className="space-y-1">
                        <div className="h-8 w-full rounded border border-border" style={{ background: `hsl(${(draft as any)[k] || "0 0% 50%"})` }} />
                        <p className="text-[10px] text-muted-foreground">{l}</p>
                        <Input className="text-xs h-7 font-mono" value={(draft as any)[k] ?? ""} onChange={(e) => updateField(k as any, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipografía Headings</Label><Input value={draft.font_heading ?? ""} onChange={(e) => updateField("font_heading", e.target.value)} /></div>
                  <div><Label>Tipografía Body</Label><Input value={draft.font_body ?? ""} onChange={(e) => updateField("font_body", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Logo URL</Label><Input value={draft.logo_url ?? ""} onChange={(e) => updateField("logo_url", e.target.value)} /></div>
                  <div><Label>Hero image URL</Label><Input value={draft.hero_image_url ?? ""} onChange={(e) => updateField("hero_image_url", e.target.value)} /></div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-3">
                <Card className="border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Mejora la copia tomando como base el contenido importado del sitio original.</p>
                    <Button size="sm" onClick={enhanceCopy} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Generar sugerencias IA
                    </Button>
                    {aiSuggestion && (
                      <div className="space-y-2 mt-3">
                        {Object.entries(aiSuggestion).map(([k, v]) => (
                          <div key={k} className="border border-border rounded p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
                              <Checkbox checked={!!acceptedAi[k]} onCheckedChange={(c) => setAcceptedAi((s) => ({ ...s, [k]: !!c }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="opacity-60"><span className="text-[10px] uppercase">Antes</span><p className="line-clamp-3">{(draft as any)[k] || <em>(vacío)</em>}</p></div>
                              <div><span className="text-[10px] uppercase text-primary">IA</span><p className="line-clamp-3">{String(v)}</p></div>
                            </div>
                          </div>
                        ))}
                        <Button size="sm" onClick={applyAi}><CheckCircle2 className="h-3 w-3 mr-1" />Aplicar seleccionados al borrador</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" />Importar imágenes a almacenamiento propio</p>
                    <p className="text-xs text-muted-foreground">Descarga logo, favicon, OG y hero del sitio original a tu Storage. <strong>Hazlo antes de eliminar la web original.</strong></p>
                    <Button size="sm" variant="outline" onClick={downloadAssets} disabled={imgLoading}>
                      {imgLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                      Importar imágenes ahora
                    </Button>
                    {Object.keys(downloaded).length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                        {Object.entries(downloaded).map(([kind, url]) => (
                          <div key={kind} className="space-y-1">
                            <div className="aspect-square bg-muted rounded overflow-hidden border border-border">
                              <img src={url} alt={kind} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{kind}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-2 mt-3">
                {versions.length === 0 && <p className="text-xs text-muted-foreground">Sin versiones aún.</p>}
                {versions.map((v) => {
                  const isOriginal = v.id === originalId;
                  return (
                    <Card key={v.id} className={isOriginal ? "border-primary/40" : ""}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs">v{v.version_number}</span>
                            <span className="text-sm truncate">{v.label ?? "Sin etiqueta"}</span>
                            {isOriginal && <Badge variant="outline" className="text-[10px]">Original</Badge>}
                            {v.source === "ai_improved" && <Badge variant="outline" className="text-[10px]">IA</Badge>}
                            {v.is_published && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">Publicada</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => restoreVersion(v)}>
                            <RotateCcw className="h-3 w-3 mr-1" />Cargar
                          </Button>
                          {!v.is_published && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => publishExisting(v)}>
                              <UploadCloud className="h-3 w-3 mr-1" />Publicar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        {hasStore && (
          <DialogFooter className="flex-wrap gap-2 sm:justify-between border-t pt-3">
            <div className="flex gap-2">
              {originalId && (
                <Button variant="outline" size="sm" onClick={restoreOriginal}>
                  <RotateCcw className="h-3 w-3 mr-1" />Volver a plantilla original
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.open(`/s/${subStore.slug}`, "_blank")}>
                <ExternalLink className="h-3 w-3 mr-1" />Ver pública
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveDraft} disabled={loading}>
                <Save className="h-3 w-3 mr-1" />Guardar borrador
              </Button>
              <Button size="sm" onClick={publish} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UploadCloud className="h-3 w-3 mr-1" />}
                Publicar versión
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RemixBrandDialog;

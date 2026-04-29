import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, GitBranch, Wand2, Palette, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  brand: { id: string; name: string; slug: string; logo_url: string | null; description: string | null; website: string | null } | null;
  onCreated?: () => void;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

const RemixBrandDialog = ({ open, onClose, brand, onCreated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [theme, setTheme] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: "", slug: "", tagline: "", description: "",
    color_primary: "", color_secondary: "", color_background: "",
    color_foreground: "", color_accent: "", font_heading: "", font_body: "",
    hero_headline: "", hero_subtitle: "",
  });

  useEffect(() => {
    if (!open || !brand) return;
    // Pre-fill from current theme as starting point
    supabase.from("theme_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      setForm({
        name: brand.name,
        slug: brand.slug,
        tagline: data?.tagline ?? "",
        description: brand.description ?? "",
        color_primary: data?.color_primary ?? "145 100% 45%",
        color_secondary: data?.color_secondary ?? "40 100% 50%",
        color_background: data?.color_background ?? "0 0% 4%",
        color_foreground: data?.color_foreground ?? "240 5% 96%",
        color_accent: data?.color_accent ?? "0 0% 15%",
        font_heading: data?.font_heading ?? "Space Grotesk",
        font_body: data?.font_body ?? "Inter",
        hero_headline: brand.name,
        hero_subtitle: brand.description ?? "",
      });
    });
  }, [open, brand]);

  const importFromWebsite = async () => {
    if (!brand?.website) { toast.error("La marca no tiene sitio web configurado"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-import-theme", {
        body: { url: brand.website },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTheme(data);
      setForm((f: any) => ({
        ...f,
        tagline: data.tagline ?? f.tagline,
        color_primary: data.color_primary ?? f.color_primary,
        color_secondary: data.color_secondary ?? f.color_secondary,
        color_background: data.color_background ?? f.color_background,
        color_foreground: data.color_foreground ?? f.color_foreground,
        color_accent: data.color_accent ?? f.color_accent,
        font_heading: data.font_heading ?? f.font_heading,
        font_body: data.font_body ?? f.font_body,
        hero_headline: data.hero_headline ?? f.hero_headline,
        hero_subtitle: data.hero_subtitle ?? f.hero_subtitle,
      }));
      toast.success("Tema importado desde el sitio de la marca");
    } catch (e: any) {
      toast.error(e.message ?? "Error importando");
    } finally {
      setAiLoading(false);
    }
  };

  const create = async () => {
    if (!brand) return;
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Nombre y slug requeridos"); return; }
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("sub_stores").insert({
        brand_id: brand.id,
        name: form.name.trim(),
        slug: slugify(form.slug),
        tagline: form.tagline || null,
        description: form.description || null,
        logo_url: brand.logo_url,
        favicon_url: theme?.favicon_url ?? null,
        og_image_url: theme?.og_image_url ?? null,
        hero_headline: form.hero_headline || null,
        hero_subtitle: form.hero_subtitle || null,
        color_primary: form.color_primary,
        color_secondary: form.color_secondary,
        color_background: form.color_background,
        color_foreground: form.color_foreground,
        color_accent: form.color_accent,
        font_heading: form.font_heading,
        font_body: form.font_body,
        source_template: brand.website ?? "main_store",
        is_active: true,
        created_by: u.user?.id,
      }).select().single();
      if (error) throw error;
      toast.success(`Sub-tienda "${form.name}" creada`);
      onCreated?.();
      onClose();
      // Open new sub-store in new tab
      window.open(`/s/${data.slug}`, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Error creando sub-tienda");
    } finally {
      setLoading(false);
    }
  };

  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Remix de marca: {brand.name}
          </DialogTitle>
          <DialogDescription>
            Crea una sub-tienda independiente para esta marca con su propio tema, branding y catálogo. Vivirá en <code className="text-xs">/s/{form.slug || brand.slug}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {brand.website && (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" />Importar branding con IA</p>
                  <p className="text-xs text-muted-foreground">Desde {brand.website}</p>
                </div>
                <Button size="sm" variant="outline" onClick={importFromWebsite} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
            </div>
          </div>

          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Frase corta de la marca" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hero headline</Label>
              <Input value={form.hero_headline} onChange={(e) => setForm({ ...form, hero_headline: e.target.value })} />
            </div>
            <div>
              <Label>Hero subtítulo</Label>
              <Input value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Paleta HSL</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
              {[
                { k: "color_primary", l: "Primario" },
                { k: "color_secondary", l: "Secundario" },
                { k: "color_background", l: "Fondo" },
                { k: "color_foreground", l: "Texto" },
                { k: "color_accent", l: "Acento" },
              ].map(({ k, l }) => (
                <div key={k} className="space-y-1">
                  <div className="h-8 w-full rounded border border-border" style={{ background: `hsl(${form[k] || "0 0% 50%"})` }} />
                  <p className="text-[10px] text-muted-foreground">{l}</p>
                  <Input className="text-xs h-7 font-mono" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipografía Headings</Label>
              <Input value={form.font_heading} onChange={(e) => setForm({ ...form, font_heading: e.target.value })} />
            </div>
            <div>
              <Label>Tipografía Body</Label>
              <Input value={form.font_body} onChange={(e) => setForm({ ...form, font_body: e.target.value })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={create} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Crear sub-tienda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemixBrandDialog;

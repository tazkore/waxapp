import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Check, Globe, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Provider = "firecrawl" | "jina" | "scrapingbee";

const ThemeImporterSection = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [theme, setTheme] = useState<any>(null);
  const [provider, setProvider] = useState<Provider>("firecrawl");

  const analyze = async () => {
    if (!url.trim()) { toast.error("Ingresa una URL"); return; }
    setLoading(true);
    setTheme(null);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-import-theme", {
        body: { url: url.trim(), provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTheme(data);
      toast.success("Tema extraído. Revisa y aplica.");
    } catch (e: any) {
      toast.error(e.message ?? "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!theme) return;
    setApplying(true);
    try {
      const { data: existing } = await supabase
        .from("theme_settings")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload: any = {
        site_name: theme.site_name,
        tagline: theme.tagline,
        favicon_url: theme.favicon_url,
        og_image_url: theme.og_image_url,
        color_primary: theme.color_primary,
        color_secondary: theme.color_secondary,
        color_background: theme.color_background,
        color_foreground: theme.color_foreground,
        color_accent: theme.color_accent,
        font_heading: theme.font_heading,
        font_body: theme.font_body,
        is_active: true,
      };

      const op = existing?.id
        ? supabase.from("theme_settings").update(payload).eq("id", existing.id)
        : supabase.from("theme_settings").insert(payload);
      const { error } = await op;
      if (error) throw error;
      toast.success("¡Tema aplicado! Recarga para ver cambios.");
    } catch (e: any) {
      toast.error(e.message ?? "Error al aplicar");
    } finally {
      setApplying(false);
    }
  };

  const ColorChip = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-center gap-2 p-2 rounded border border-border">
      <div className="h-8 w-8 rounded shrink-0 border border-border" style={{ background: value ? `hsl(${value})` : "transparent" }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className="text-xs font-mono truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Importar Tema con IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Pega la URL de cualquier sitio web. La IA extraerá colores, tipografías, logo y branding para clonar su estilo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> URL de origen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)} disabled={loading}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="firecrawl">Firecrawl</SelectItem>
                <SelectItem value="jina">Jina Reader</SelectItem>
                <SelectItem value="scrapingbee">ScrapingBee</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="https://miempresa.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <Button onClick={analyze} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Analizar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Tarda ~10-20s. Combina el proveedor de scraping con Lovable AI.</p>
        </CardContent>
      </Card>

      {theme && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Tema extraído — previsualización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Marca</Label>
                <p className="text-sm font-medium">{theme.site_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs">Tagline</Label>
                <p className="text-sm">{theme.tagline || "—"}</p>
              </div>
              <div>
                <Label className="text-xs">Hero headline</Label>
                <p className="text-sm">{theme.hero_headline || "—"}</p>
              </div>
              <div>
                <Label className="text-xs">Hero subtítulo</Label>
                <p className="text-sm">{theme.hero_subtitle || "—"}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Paleta HSL</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
                <ColorChip label="Primario" value={theme.color_primary} />
                <ColorChip label="Secundario" value={theme.color_secondary} />
                <ColorChip label="Fondo" value={theme.color_background} />
                <ColorChip label="Texto" value={theme.color_foreground} />
                <ColorChip label="Acento" value={theme.color_accent} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipografía Headings</Label>
                <p className="text-sm font-medium" style={{ fontFamily: theme.font_heading }}>
                  {theme.font_heading || "—"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Tipografía Body</Label>
                <p className="text-sm" style={{ fontFamily: theme.font_body }}>
                  {theme.font_body || "—"}
                </p>
              </div>
            </div>

            {theme.style_notes && (
              <div>
                <Label className="text-xs">Notas de estilo</Label>
                <p className="text-sm text-muted-foreground italic">{theme.style_notes}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border">
              {theme.favicon_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img src={theme.favicon_url} alt="favicon" className="h-6 w-6 rounded" /> Favicon
                </div>
              )}
              {theme.og_image_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img src={theme.og_image_url} alt="og" className="h-6 w-10 rounded object-cover" /> OG image
                </div>
              )}
            </div>

            <Button onClick={apply} disabled={applying} className="w-full">
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Aplicar este tema al sitio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThemeImporterSection;

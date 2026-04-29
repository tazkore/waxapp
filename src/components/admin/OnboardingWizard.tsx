import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Upload, Image as ImageIcon, Check, Globe, Palette, KeyRound, Rocket } from "lucide-react";

const DISMISS_KEY = "wax_onboarding_dismissed";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onJumpToImporter?: () => void;
}

const OnboardingWizard = ({ open, onClose, onJumpToImporter }: Props) => {
  const [tab, setTab] = useState("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [data, setData] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("theme_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setData(data ?? {});
        setLoading(false);
      });
  }, [open]);

  const upload = async (field: string, file: File) => {
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `theme/${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      setData({ ...data, [field]: pub.publicUrl });
      toast({ title: "Imagen cargada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const payload = {
        site_name: data.site_name || "WAXAPP",
        tagline: data.tagline,
        logo_url: data.logo_url,
        logo_dark_url: data.logo_dark_url,
        favicon_url: data.favicon_url,
        og_image_url: data.og_image_url,
        color_primary: data.color_primary || "145 100% 45%",
        color_secondary: data.color_secondary || "40 100% 50%",
        color_background: data.color_background || "0 0% 4%",
        color_foreground: data.color_foreground || "240 5% 96%",
        color_accent: data.color_accent || "0 0% 15%",
        font_heading: data.font_heading || "Space Grotesk",
        font_body: data.font_body || "Inter",
        is_active: true,
        onboarding_completed: true,
      };
      const op = data.id
        ? supabase.from("theme_settings").update(payload).eq("id", data.id)
        : supabase.from("theme_settings").insert(payload);
      const { error } = await op;
      if (error) throw error;
      toast({ title: "¡Listo!", description: "Configuración inicial guardada" });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const ImageField = ({ field, label }: { field: string; label: string }) => (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {data[field] ? (
            <img src={data[field]} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <label className="cursor-pointer flex-1">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])}
          />
          <div className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded text-sm text-muted-foreground hover:bg-muted/50">
            {uploading === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir imagen
          </div>
        </label>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Setup Inicial
          </DialogTitle>
          <DialogDescription>
            Configura tu marca, colores, APIs e importa tu tienda anterior — todo en un solo lugar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="identity"><Globe className="h-4 w-4 mr-1" />Marca</TabsTrigger>
              <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-1" />Colores</TabsTrigger>
              <TabsTrigger value="apis"><KeyRound className="h-4 w-4 mr-1" />APIs</TabsTrigger>
              <TabsTrigger value="import"><Rocket className="h-4 w-4 mr-1" />Importar</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del sitio</Label>
                  <Input value={data.site_name || ""} onChange={(e) => setData({ ...data, site_name: e.target.value })} placeholder="WAXAPP" />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input value={data.tagline || ""} onChange={(e) => setData({ ...data, tagline: e.target.value })} placeholder="Bio-tech wellness" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ImageField field="logo_url" label="Logo (claro)" />
                <ImageField field="logo_dark_url" label="Logo (oscuro)" />
                <ImageField field="favicon_url" label="Favicon" />
                <ImageField field="og_image_url" label="OG Image" />
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">Formato HSL sin <code>hsl()</code>. Ej: <code>145 100% 45%</code></p>
              {[
                { k: "color_primary", l: "Primario" },
                { k: "color_secondary", l: "Secundario" },
                { k: "color_background", l: "Fondo" },
                { k: "color_foreground", l: "Texto" },
                { k: "color_accent", l: "Acento" },
              ].map(({ k, l }) => (
                <div key={k} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded border border-border" style={{ background: `hsl(${data[k] || "0 0% 50%"})` }} />
                  <Label className="w-28">{l}</Label>
                  <Input value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} placeholder="145 100% 45%" />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="apis" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">Estado de conexiones para esta instancia:</p>
              {[
                { name: "Lovable AI", desc: "IA para generación de contenido", on: true },
                { name: "Resend (Emails)", desc: "Notificaciones transaccionales", on: true },
                { name: "Clip (Pagos)", desc: "Procesador de pagos México", on: true },
                { name: "Firecrawl (Scraping)", desc: "Importar sitios externos con IA", on: true },
              ].map((s) => (
                <Card key={s.name}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Check className="h-4 w-4" /> Activo
                    </span>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Para gestionar más APIs ve a <strong>API & Conexiones</strong> en el menú lateral.
              </p>
            </TabsContent>

            <TabsContent value="import" className="space-y-4 pt-4">
              <Card>
                <CardContent className="py-4 space-y-3">
                  <p className="text-sm">
                    ¿Migras desde otra plataforma? Importa productos, imágenes y branding de tu sitio anterior con IA.
                  </p>
                  <Button
                    onClick={() => {
                      onClose();
                      onJumpToImporter?.();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Abrir Importador de Sitio
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cerrar</Button>
          <div className="flex gap-2">
            {tab !== "import" && (
              <Button
                variant="outline"
                onClick={() => {
                  const order = ["identity", "colors", "apis", "import"];
                  setTab(order[order.indexOf(tab) + 1] || "import");
                }}
              >
                Siguiente
              </Button>
            )}
            <Button onClick={finish} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalizar setup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;

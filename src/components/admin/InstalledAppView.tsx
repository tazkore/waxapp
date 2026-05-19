import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package2, ExternalLink, Settings, Unplug } from "lucide-react";
import { toast } from "sonner";

interface AppDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon_url: string | null;
  is_installed: boolean;
}

interface InstalledAppViewProps {
  slug: string;
}

const InstalledAppView = ({ slug }: InstalledAppViewProps) => {
  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uninstalling, setUninstalling] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setApp(data as AppDetail | null);
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleUninstall = async () => {
    if (!app) return;
    if (!confirm(`¿Desinstalar ${app.name}? El enlace desaparecerá del menú lateral.`)) return;
    setUninstalling(true);
    const { error } = await supabase
      .from("integrations")
      .update({ is_installed: false })
      .eq("id", app.id);
    setUninstalling(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${app.name} desinstalado`);
      setApp({ ...app, is_installed: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        App "<code>{slug}</code>" no encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
          {app.icon_url
            ? <img src={app.icon_url} alt={app.name} className="h-10 w-10 object-contain" />
            : <Package2 className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold">{app.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">{app.description ?? "Sin descripción"}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">{app.category}</Badge>
            <Badge variant={app.is_installed ? "default" : "secondary"}>
              {app.is_installed ? "Instalado" : "Desinstalado"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Configuración
            </CardTitle>
            <CardDescription>Parámetros de la integración</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Configura las credenciales y opciones de <strong>{app.name}</strong> desde{" "}
              <strong>Admin → Integraciones</strong> o contacta al soporte de Grupoko.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" /> Acceso rápido
            </CardTitle>
            <CardDescription>Enlace directo a la herramienta</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Este app se integra directamente con WAXAPP. Navega a la sección correspondiente en el menú para usarlo.
            </p>
          </CardContent>
        </Card>
      </div>

      {app.is_installed && (
        <div className="pt-2">
          <Button variant="destructive" size="sm" onClick={handleUninstall} disabled={uninstalling}>
            {uninstalling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}
            Desinstalar {app.name}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Desinstalar eliminará este app del menú lateral. Puedes reinstalarlo desde App Store.
          </p>
        </div>
      )}
    </div>
  );
};

export default InstalledAppView;

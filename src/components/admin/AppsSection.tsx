import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppWindow, ExternalLink, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon_url: string | null;
  is_active: boolean;
  is_installed: boolean;
}

const AppsSection = () => {
  const [apps, setApps] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('integrations')
        .select('id,slug,name,description,category,icon_url,is_active,is_installed')
        .eq('is_installed', true)
        .order('name');
      setApps((data as Integration[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AppWindow className="h-6 w-6 text-primary" /> Aplicaciones instaladas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apps que ya conectaste a tu tienda. Para instalar más, ve al Hub de Integraciones.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : apps.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="text-center py-12 text-muted-foreground">
            No hay apps instaladas. Visita Integraciones para conectar nuevas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((a) => (
            <Card key={a.id} className="bg-card border-border hover:border-primary/40 transition">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                {a.icon_url ? (
                  <img src={a.icon_url} alt={a.name} className="w-10 h-10 rounded-md object-contain bg-muted p-1" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <AppWindow className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base text-foreground truncate">{a.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={a.is_active ? 'border-primary/30 text-primary mt-1' : 'border-border text-muted-foreground mt-1'}
                  >
                    {a.is_active ? 'Activa' : 'Pausada'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{a.description || 'Sin descripción'}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1">
                    <SettingsIcon className="w-3 h-3" /> Configurar
                  </Button>
                  <Button size="sm" variant="ghost" className="px-2"><ExternalLink className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppsSection;

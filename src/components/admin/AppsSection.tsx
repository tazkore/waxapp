import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppWindow, Search, CheckCircle2, Loader2, Store, Package, CreditCard, Mail, ShoppingBag, BarChart3, MessageCircle, Truck, FileText, Headphones, Puzzle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const categoryLabels: Record<string, string> = {
  pagos: 'Pagos', payments: 'Pagos',
  email: 'Email',
  marketplace: 'Marketplace',
  analytics: 'Analytics', marketing: 'Marketing',
  mensajeria: 'Mensajería', messaging: 'Mensajería',
  envios: 'Envíos',
  facturacion: 'Facturación',
  soporte: 'Soporte',
  automation: 'Automatización',
  other: 'Otro',
};

const categoryColors: Record<string, string> = {
  pagos: 'bg-emerald-500/10 text-emerald-400', payments: 'bg-emerald-500/10 text-emerald-400',
  email: 'bg-blue-500/10 text-blue-400',
  marketplace: 'bg-orange-500/10 text-orange-400',
  analytics: 'bg-purple-500/10 text-purple-400', marketing: 'bg-purple-500/10 text-purple-400',
  mensajeria: 'bg-cyan-500/10 text-cyan-400', messaging: 'bg-cyan-500/10 text-cyan-400',
  envios: 'bg-yellow-500/10 text-yellow-400',
  facturacion: 'bg-rose-500/10 text-rose-400',
  soporte: 'bg-indigo-500/10 text-indigo-400',
  automation: 'bg-teal-500/10 text-teal-400',
  other: 'bg-muted text-muted-foreground',
};

const categoryIcons: Record<string, any> = {
  pagos: CreditCard, payments: CreditCard,
  email: Mail,
  marketplace: ShoppingBag,
  analytics: BarChart3, marketing: BarChart3,
  mensajeria: MessageCircle, messaging: MessageCircle,
  envios: Truck,
  facturacion: FileText,
  soporte: Headphones,
  automation: Puzzle,
  other: AppWindow,
};

const AppCard = ({
  app,
  onToggle,
  toggling,
}: {
  app: Integration;
  onToggle: (app: Integration) => void;
  toggling: string | null;
}) => (
  <Card className="bg-card border-border hover:border-primary/30 transition-colors flex flex-col">
    <CardHeader className="flex flex-row items-center gap-3 pb-3">
      {app.icon_url ? (
        <img src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-md object-contain bg-muted p-1 shrink-0" />
      ) : (
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${categoryColors[app.category] ?? 'bg-muted text-muted-foreground'}`}>
          {(() => { const Icon = categoryIcons[app.category] ?? AppWindow; return <Icon className="w-5 h-5" />; })()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <CardTitle className="text-base text-foreground truncate">{app.name}</CardTitle>
        <span className="text-xs text-muted-foreground capitalize">
          {categoryLabels[app.category] ?? app.category}
        </span>
      </div>
      {app.is_installed && (
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      )}
    </CardHeader>
    <CardContent className="flex flex-col flex-1 space-y-3">
      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
        {app.description || 'Sin descripción'}
      </p>
      <Button
        size="sm"
        variant={app.is_installed ? 'outline' : 'default'}
        className="w-full"
        onClick={() => onToggle(app)}
        disabled={toggling === app.id}
      >
        {toggling === app.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : null}
        {app.is_installed ? 'Desinstalar' : 'Instalar'}
      </Button>
    </CardContent>
  </Card>
);

const AppsSection = () => {
  const [apps, setApps] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchApps = async () => {
    const { data, error } = await supabase
      .from('integrations')
      .select('id,slug,name,description,category,icon_url,is_active,is_installed')
      .order('name');
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las apps.', variant: 'destructive' });
    } else {
      setApps((data as Integration[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const toggleInstall = async (app: Integration) => {
    setToggling(app.id);
    const newInstalled = !app.is_installed;
    const { error } = await supabase
      .from('integrations')
      .update({ is_installed: newInstalled })
      .eq('id', app.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: newInstalled ? 'App instalada' : 'App desinstalada',
        description: app.name,
      });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, is_installed: newInstalled } : a));
    }
    setToggling(null);
  };

  const filtered = apps.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.description ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const installed = filtered.filter(a => a.is_installed);
  const available = filtered.filter(a => !a.is_installed);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> App Store
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explora e instala integraciones para conectar tu tienda con otros servicios.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar apps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted border-border"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="store">
          <TabsList className="mb-4">
            <TabsTrigger value="store" className="gap-2">
              <Store className="h-4 w-4" /> Tienda
              {available.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{available.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="installed" className="gap-2">
              <Package className="h-4 w-4" /> Instaladas
              {installed.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{installed.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            {available.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="text-center py-12 text-muted-foreground">
                  {search ? 'Sin resultados para tu búsqueda.' : 'Todas las apps disponibles ya están instaladas.'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {available.map(app => (
                  <AppCard key={app.id} app={app} onToggle={toggleInstall} toggling={toggling} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="installed">
            {installed.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="text-center py-12 text-muted-foreground">
                  No hay apps instaladas. Ve a la Tienda para instalar nuevas.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {installed.map(app => (
                  <AppCard key={app.id} app={app} onToggle={toggleInstall} toggling={toggling} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AppsSection;

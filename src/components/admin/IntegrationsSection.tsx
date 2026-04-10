import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Mail,
  ShoppingBag,
  BarChart3,
  MessageCircle,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Settings2,
  CheckCircle2,
  Circle,
  Puzzle,
  Loader2,
  Key,
  Plus,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  category: string;
  is_installed: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
  api_docs_url: string | null;
  version: string | null;
  created_at: string;
  updated_at: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  pagos: CreditCard,
  email: Mail,
  marketplace: ShoppingBag,
  analytics: BarChart3,
  mensajeria: MessageCircle,
  other: Puzzle,
};

const categoryLabels: Record<string, string> = {
  pagos: 'Pagos',
  email: 'Email',
  marketplace: 'Marketplace',
  analytics: 'Analytics',
  mensajeria: 'Mensajería',
  other: 'Otro',
};

const IntegrationsSection = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [savingKeys, setSavingKeys] = useState(false);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigValue, setNewConfigValue] = useState('');
  const { toast } = useToast();

  const fetchIntegrations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('is_installed', { ascending: false })
      .order('name');

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las integraciones.', variant: 'destructive' });
    } else {
      setIntegrations((data as unknown as Integration[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const toggleInstall = async (app: Integration) => {
    const newInstalled = !app.is_installed;
    const { error } = await supabase
      .from('integrations')
      .update({ is_installed: newInstalled, is_active: newInstalled ? app.is_active : false })
      .eq('id', app.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la integración.', variant: 'destructive' });
    } else {
      toast({ title: newInstalled ? 'Instalada' : 'Desinstalada', description: `${app.name} fue ${newInstalled ? 'instalada' : 'desinstalada'}.` });
      fetchIntegrations();
      if (selectedApp?.id === app.id) {
        setSelectedApp({ ...app, is_installed: newInstalled, is_active: newInstalled ? app.is_active : false });
      }
    }
  };

  const toggleActive = async (app: Integration) => {
    const newActive = !app.is_active;
    const { error } = await supabase
      .from('integrations')
      .update({ is_active: newActive })
      .eq('id', app.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } else {
      toast({ title: newActive ? 'Activada' : 'Desactivada', description: `${app.name} fue ${newActive ? 'activada' : 'desactivada'}.` });
      fetchIntegrations();
      if (selectedApp?.id === app.id) {
        setSelectedApp({ ...app, is_active: newActive });
      }
    }
  };

  const openDetail = (app: Integration) => {
    setSelectedApp(app);
    const cfg = app.config as Record<string, unknown>;
    // Load API keys
    const keys: Record<string, string> = {};
    if (cfg.api_keys && typeof cfg.api_keys === 'object') {
      Object.entries(cfg.api_keys as Record<string, string>).forEach(([k, v]) => {
        keys[k] = v;
      });
    }
    setApiKeys(keys);
    // Load non-key config fields
    const fields: Record<string, string> = {};
    Object.entries(cfg).filter(([k]) => k !== 'api_keys').forEach(([k, v]) => {
      fields[k] = typeof v === 'string' ? v : JSON.stringify(v);
    });
    setConfigFields(fields);
    setShowAddKey(false);
    setShowAddConfig(false);
    setNewKeyName('');
    setNewKeyValue('');
    setNewConfigKey('');
    setNewConfigValue('');
    setVisibleKeys(new Set());
    setDetailOpen(true);
  };

  const maskValue = (val: string) => {
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••' + val.slice(-4);
  };

  const saveApiKeys = async (app: Integration, keys: Record<string, string>) => {
    setSavingKeys(true);
    const currentConfig = (app.config || {}) as Record<string, unknown>;
    const newConfig = { ...currentConfig, api_keys: keys };
    const { error } = await supabase
      .from('integrations')
      .update({ config: newConfig })
      .eq('id', app.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar las API keys.', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'API keys actualizadas correctamente.' });
      setSelectedApp({ ...app, config: newConfig });
      fetchIntegrations();
    }
    setSavingKeys(false);
  };

  const addApiKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({ title: 'Error', description: 'Nombre y valor son requeridos.', variant: 'destructive' });
      return;
    }
    const updated = { ...apiKeys, [newKeyName.trim()]: newKeyValue.trim() };
    setApiKeys(updated);
    setNewKeyName('');
    setNewKeyValue('');
    setShowAddKey(false);
    if (selectedApp) saveApiKeys(selectedApp, updated);
  };

  const removeApiKey = (keyName: string) => {
    const updated = { ...apiKeys };
    delete updated[keyName];
    setApiKeys(updated);
    if (selectedApp) saveApiKeys(selectedApp, updated);
  };

  const updateApiKeyValue = (keyName: string, value: string) => {
    const updated = { ...apiKeys, [keyName]: value };
    setApiKeys(updated);
  };

  const toggleKeyVisibility = (keyName: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyName)) next.delete(keyName);
      else next.add(keyName);
      return next;
    });
  };

  const saveConfigFields = async (app: Integration, fields: Record<string, string>) => {
    const currentConfig = (app.config || {}) as Record<string, unknown>;
    const parsed: Record<string, unknown> = {};
    Object.entries(fields).forEach(([k, v]) => {
      try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
    });
    const newConfig = { ...parsed, api_keys: currentConfig.api_keys };
    const { error } = await supabase.from('integrations').update({ config: newConfig as unknown as null }).eq('id', app.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Configuración actualizada.' });
      setSelectedApp({ ...app, config: newConfig as Record<string, unknown> });
      fetchIntegrations();
    }
  };

  const addConfigField = () => {
    if (!newConfigKey.trim()) {
      toast({ title: 'Error', description: 'El nombre del campo es requerido.', variant: 'destructive' });
      return;
    }
    const updated = { ...configFields, [newConfigKey.trim()]: newConfigValue.trim() };
    setConfigFields(updated);
    setNewConfigKey('');
    setNewConfigValue('');
    setShowAddConfig(false);
    if (selectedApp) saveConfigFields(selectedApp, updated);
  };

  const removeConfigField = (key: string) => {
    const updated = { ...configFields };
    delete updated[key];
    setConfigFields(updated);
    if (selectedApp) saveConfigFields(selectedApp, updated);
  };

  const filtered = integrations.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  const installed = filtered.filter((a) => a.is_installed);
  const available = filtered.filter((a) => !a.is_installed);

  const AppCard = ({ app }: { app: Integration }) => {
    const Icon = categoryIcons[app.category] || Puzzle;
    return (
      <Card
        className="cursor-pointer hover:border-primary/40 transition-colors group"
        onClick={() => openDetail(app)}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.name} className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Icon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-foreground truncate">{app.name}</h3>
                {app.is_active && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{app.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {categoryLabels[app.category] || app.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">v{app.version}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            {app.is_installed ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); toggleInstall(app); }}
              >
                <Trash2 className="h-3 w-3" /> Desinstalar
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); toggleInstall(app); }}
              >
                <Download className="h-3 w-3" /> Instalar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integraciones</h1>
        <p className="text-muted-foreground text-sm">Gestiona las aplicaciones y APIs conectadas a tu tienda.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar integraciones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="installed">
        <TabsList>
          <TabsTrigger value="installed" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Instaladas ({installed.length})
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> App Store ({available.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <Circle className="h-3.5 w-3.5" /> Todas ({filtered.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-4">
          {installed.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No tienes integraciones instaladas aún.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {installed.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="store" className="mt-4">
          {available.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No hay integraciones disponibles que coincidan con tu búsqueda.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {available.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((app) => <AppCard key={app.id} app={app} />)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {selectedApp.icon_url ? (
                      <img src={selectedApp.icon_url} alt={selectedApp.name} className="h-6 w-6 object-contain" />
                    ) : (
                      (() => { const I = categoryIcons[selectedApp.category] || Puzzle; return <I className="h-5 w-5 text-muted-foreground" />; })()
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selectedApp.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {categoryLabels[selectedApp.category] || selectedApp.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">v{selectedApp.version}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <p className="text-sm text-muted-foreground">{selectedApp.description}</p>

                {/* Status */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Estado
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Instalada</span>
                    <Badge variant={selectedApp.is_installed ? 'default' : 'secondary'}>
                      {selectedApp.is_installed ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                  {selectedApp.is_installed && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Activa</span>
                      <Switch
                        checked={selectedApp.is_active}
                        onCheckedChange={() => toggleActive(selectedApp)}
                      />
                    </div>
                  )}
                </div>

                {/* API Keys */}
                {selectedApp.is_installed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Key className="h-4 w-4" /> API Keys
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowAddKey(!showAddKey)}
                      >
                        {showAddKey ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {showAddKey ? 'Cancelar' : 'Agregar'}
                      </Button>
                    </div>

                    {showAddKey && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div>
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            placeholder="ej: API_KEY, SECRET_KEY"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor</Label>
                          <Input
                            placeholder="sk_live_..."
                            value={newKeyValue}
                            onChange={(e) => setNewKeyValue(e.target.value)}
                            className="h-8 text-xs mt-1 font-mono"
                            type="password"
                          />
                        </div>
                        <Button size="sm" className="text-xs gap-1 w-full" onClick={addApiKey} disabled={savingKeys}>
                          {savingKeys ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Guardar Key
                        </Button>
                      </div>
                    )}

                    {Object.keys(apiKeys).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(apiKeys).map(([keyName, keyValue]) => (
                          <div key={keyName} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2.5">
                            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{keyName}</span>
                            <div className="flex-1 min-w-0">
                              {visibleKeys.has(keyName) ? (
                                <Input
                                  value={keyValue}
                                  onChange={(e) => updateApiKeyValue(keyName, e.target.value)}
                                  onBlur={() => { if (selectedApp) saveApiKeys(selectedApp, apiKeys); }}
                                  className="h-7 text-xs font-mono"
                                />
                              ) : (
                                <span className="text-xs font-mono text-foreground">{maskValue(keyValue)}</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleKeyVisibility(keyName)}
                            >
                              {visibleKeys.has(keyName) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeApiKey(keyName)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No hay API keys configuradas.</p>
                    )}
                  </div>
                )}

                {/* Non-key Config */}
                {selectedApp.is_installed && (() => {
                  const cfg = selectedApp.config as Record<string, unknown>;
                  const nonKeyEntries = Object.entries(cfg).filter(([k]) => k !== 'api_keys');
                  if (nonKeyEntries.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Configuración</h4>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        {nonKeyEntries.map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-mono">{key}</span>
                            <span className="text-foreground">{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {selectedApp.api_docs_url && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <a href={selectedApp.api_docs_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" /> Documentación
                      </a>
                    </Button>
                  )}
                  {selectedApp.is_installed ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => { toggleInstall(selectedApp); setDetailOpen(false); }}
                    >
                      <Trash2 className="h-3 w-3" /> Desinstalar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => { toggleInstall(selectedApp); setDetailOpen(false); }}
                    >
                      <Download className="h-3 w-3" /> Instalar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsSection;

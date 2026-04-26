import { useEffect, useState } from 'react';
import { ShoppingBag, RefreshCw, Loader2, CheckCircle2, AlertCircle, Save, Package, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AmazonConfig {
  id?: string;
  seller_id: string | null;
  marketplace_id: string | null;
  region: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
}

interface AmazonProduct {
  asin: string; sku: string | null; title: string; price: number; quantity: number;
  fulfillment_channel: string | null; status: string | null; synced_at: string;
}

interface AmazonOrder {
  amazon_order_id: string; purchase_date: string | null; order_status: string | null;
  fulfillment_channel: string | null; total: number; buyer_email: string | null; synced_at: string;
}

const AmazonSection = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AmazonConfig>({
    seller_id: '', marketplace_id: 'A1AM78C64UM0Y8', region: 'na', is_active: false,
    last_sync_at: null, last_sync_status: null,
  });
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [orders, setOrders] = useState<AmazonOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [cfgRes, prodRes, ordRes] = await Promise.all([
      supabase.from('amazon_config').select('*').limit(1).maybeSingle(),
      supabase.from('amazon_products').select('*').order('synced_at', { ascending: false }).limit(50),
      supabase.from('amazon_orders').select('*').order('purchase_date', { ascending: false }).limit(50),
    ]);
    if (cfgRes.data) setConfig(cfgRes.data as AmazonConfig);
    setProducts((prodRes.data as AmazonProduct[]) ?? []);
    setOrders((ordRes.data as AmazonOrder[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    const payload = {
      seller_id: config.seller_id?.trim() || null,
      marketplace_id: config.marketplace_id?.trim() || 'A1AM78C64UM0Y8',
      region: config.region || 'na',
      is_active: config.is_active,
    };
    const { error } = config.id
      ? await supabase.from('amazon_config').update(payload).eq('id', config.id)
      : await supabase.from('amazon_config').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Configuración guardada' }); load(); }
    setSaving(false);
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('amazon-sync');
      if (error) throw error;
      const d = data as { products?: number; orders?: number; errors?: string[] };
      toast({
        title: 'Sincronización completa',
        description: `${d.products ?? 0} productos · ${d.orders ?? 0} pedidos${d.errors?.length ? ` · ${d.errors.length} error(es)` : ''}`,
      });
      load();
    } catch (e) {
      toast({ title: 'Error en sincronización', description: e instanceof Error ? e.message : 'Verifica los secrets de Amazon en Cloud.', variant: 'destructive' });
    }
    setSyncing(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Amazon Seller
          </h1>
          <p className="text-sm text-muted-foreground">Sincroniza productos FBA y pedidos directo de tu cuenta de vendedor.</p>
        </div>
        <Button onClick={triggerSync} disabled={syncing || !config.is_active} className="gap-2">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sincronizar ahora
        </Button>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Productos FBA ({products.length})</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5"><Truck className="h-3.5 w-3.5" /> Pedidos FBA ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciales SP-API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Pasos:</strong> Estos secrets deben configurarse en Lovable Cloud → Settings → Secrets:</p>
                <ul className="list-disc ml-5 space-y-0.5">
                  <li><code className="text-primary">AMAZON_LWA_CLIENT_ID</code> — Login with Amazon Client ID</li>
                  <li><code className="text-primary">AMAZON_LWA_CLIENT_SECRET</code> — Login with Amazon Client Secret</li>
                  <li><code className="text-primary">AMAZON_REFRESH_TOKEN</code> — Refresh token de tu Selling Partner App</li>
                </ul>
                <p className="mt-2">Obténlos en <a href="https://developer-docs.amazon.com/sp-api/" target="_blank" rel="noreferrer" className="text-primary underline">developer-docs.amazon.com/sp-api</a> registrando tu app.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seller ID</Label>
                  <Input value={config.seller_id ?? ''} onChange={e => setConfig({ ...config, seller_id: e.target.value })} placeholder="A1XXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Marketplace ID</Label>
                  <Input value={config.marketplace_id ?? ''} onChange={e => setConfig({ ...config, marketplace_id: e.target.value })} placeholder="A1AM78C64UM0Y8 (México)" />
                </div>
                <div className="space-y-2">
                  <Label>Región</Label>
                  <select className="w-full rounded-md bg-muted border border-border px-3 py-2 text-sm" value={config.region ?? 'na'} onChange={e => setConfig({ ...config, region: e.target.value })}>
                    <option value="na">North America (US/CA/MX)</option>
                    <option value="eu">Europe</option>
                    <option value="fe">Far East</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 border border-border">
                    <Label>Integración activa</Label>
                    <Switch checked={config.is_active} onCheckedChange={v => setConfig({ ...config, is_active: v })} />
                  </div>
                </div>
              </div>

              {config.last_sync_at && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {config.last_sync_status?.startsWith('success') ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  Última sincronización: {new Date(config.last_sync_at).toLocaleString('es-MX')} — {config.last_sync_status}
                </div>
              )}

              <Button onClick={saveConfig} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {products.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Sin productos aún. Activa la integración y sincroniza.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <Card key={p.asin}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">ASIN: {p.asin} · SKU: {p.sku ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{p.fulfillment_channel === 'AMAZON' ? 'FBA' : 'FBM'}</Badge>
                      <span className="text-xs text-muted-foreground">Stock: <strong className="text-foreground">{p.quantity}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Sin pedidos sincronizados aún.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <Card key={o.amazon_order_id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-mono">{o.amazon_order_id}</p>
                      <p className="text-[11px] text-muted-foreground">{o.purchase_date ? new Date(o.purchase_date).toLocaleString('es-MX') : '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{o.order_status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{o.fulfillment_channel === 'AFN' ? 'FBA' : 'FBM'}</Badge>
                      <span className="text-sm font-bold text-foreground">${Number(o.total).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AmazonSection;

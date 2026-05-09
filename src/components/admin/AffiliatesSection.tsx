import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, Copy, Download, FileText, Link2, Loader2, MousePointerClick, ShoppingCart, TrendingUp, Wallet, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { exportAffiliatesCSV, exportAffiliatesPDF, type AffiliateRow } from '@/lib/exportAffiliates';

const PUBLIC_BASE = (typeof window !== 'undefined' ? window.location.origin : 'https://waxapp.mx');

const AffiliatesSection = () => {
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  });
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, c, s] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('affiliate_clicks').select('*'),
      supabase.from('affiliate_sales').select('*'),
    ]);
    setAffiliates(a.data ?? []);
    setClicks(c.data ?? []);
    setSales(s.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from('affiliates').update(patch).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Afiliado ${status}` }); load(); }
  };

  const markPaid = async (a: any) => {
    const { error } = await supabase.from('affiliate_sales').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('affiliate_id', a.id).eq('status', 'pending');
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('affiliates').update({ paid_payout: Number(a.paid_payout) + Number(a.pending_payout), pending_payout: 0 }).eq('id', a.id);
    toast({ title: 'Pago registrado' });
    load();
  };

  const inRange = (iso: string) => {
    if (!range.from || !range.to) return true;
    const t = new Date(iso).getTime();
    return t >= range.from.setHours(0, 0, 0, 0) && t <= range.to.setHours(23, 59, 59, 999);
  };

  const filtered = useMemo(() => {
    const fc = clicks.filter((c) => inRange(c.created_at));
    const fs = sales.filter((s) => inRange(s.created_at));
    return { fc, fs };
  }, [clicks, sales, range.from, range.to]);

  const kpis = useMemo(() => {
    const totalClicks = filtered.fc.length;
    const totalSales = filtered.fs.length;
    const conv = totalClicks ? (totalSales / totalClicks) * 100 : 0;
    const commissions = filtered.fs.reduce((sum, s) => sum + Number(s.commission || 0), 0);
    return { totalClicks, totalSales, conv, commissions };
  }, [filtered]);

  const ranking = useMemo(() => {
    const map = new Map<string, { aff: any; clicks: number; sales: number; commission: number }>();
    affiliates.forEach((a) => map.set(a.id, { aff: a, clicks: 0, sales: 0, commission: 0 }));
    filtered.fc.forEach((c) => { const r = map.get(c.affiliate_id); if (r) r.clicks++; });
    filtered.fs.forEach((s) => { const r = map.get(s.affiliate_id); if (r) { r.sales++; r.commission += Number(s.commission || 0); } });
    return Array.from(map.values()).sort((a, b) => b.commission - a.commission);
  }, [affiliates, filtered]);

  const generatedLink = useMemo(() => {
    const a = affiliates.find((x) => x.id === selectedAffiliate);
    if (!a) return '';
    return `${PUBLIC_BASE}/tienda?ref=${a.code}`;
  }, [selectedAffiliate, affiliates]);

  const copyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: 'Link copiado' });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const pending = affiliates.filter((a) => a.status === 'pending');
  const approved = affiliates.filter((a) => a.status === 'approved');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Afiliados / Vendedores</h1>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes ({pending.length})</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores ({approved.length})</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground text-base flex items-center gap-2"><Link2 className="h-4 w-4" />Generador de links</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
                <SelectTrigger className="w-[260px] bg-muted border-border"><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                <SelectContent>
                  {approved.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name} · {a.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                readOnly
                value={generatedLink}
                placeholder="Selecciona un vendedor para generar link"
                className="flex-1 min-w-[260px] bg-muted border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono"
              />
              <Button onClick={copyLink} disabled={!generatedLink} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('justify-start text-left font-normal', !range.from && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range.from && range.to
                    ? `${format(range.from, 'd MMM', { locale: es })} – ${format(range.to, 'd MMM yyyy', { locale: es })}`
                    : 'Rango de fechas'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={range as any} onSelect={(r: any) => setRange(r ?? {})} numberOfMonths={2} className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Clics totales', value: kpis.totalClicks.toLocaleString(), icon: MousePointerClick },
              { label: 'Conversiones', value: kpis.totalSales.toLocaleString(), icon: ShoppingCart },
              { label: 'Tasa conversión', value: `${kpis.conv.toFixed(1)}%`, icon: TrendingUp },
              { label: 'Comisiones', value: `$${kpis.commissions.toLocaleString()}`, icon: Wallet },
            ].map((k) => (
              <Card key={k.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</span>
                    <k.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground text-base">Ranking de vendedores</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Vendedor</th>
                    <th className="text-left p-2">Link</th>
                    <th className="text-right p-2">Visitas</th>
                    <th className="text-right p-2">Ventas</th>
                    <th className="text-right p-2">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin datos en el rango.</td></tr>}
                  {ranking.map((r, idx) => (
                    <tr key={r.aff.id} className="border-t border-border">
                      <td className="p-2 text-foreground font-bold">#{idx + 1}</td>
                      <td className="p-2 text-foreground">{r.aff.full_name}<div className="text-xs text-muted-foreground">{r.aff.email}</div></td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">/tienda?ref={r.aff.code}</td>
                      <td className="p-2 text-right text-foreground">{r.clicks}</td>
                      <td className="p-2 text-right text-foreground">{r.sales}</td>
                      <td className="p-2 text-right text-secondary font-bold">${r.commission.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOLICITUDES */}
        <TabsContent value="solicitudes">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground text-base">Solicitudes pendientes ({pending.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pending.length === 0 && <p className="text-sm text-muted-foreground">Sin solicitudes.</p>}
              {pending.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                  <div>
                    <p className="font-medium text-foreground">{a.full_name} <span className="text-xs text-muted-foreground">· {a.email}</span></p>
                    <p className="text-xs text-muted-foreground font-mono">{a.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setStatus(a.id, 'approved')} className="gap-1"><Check className="h-4 w-4" />Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(a.id, 'rejected')} className="gap-1"><X className="h-4 w-4" />Rechazar</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDEDORES */}
        <TabsContent value="vendedores">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground text-base">Vendedores activos & pagos pendientes</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr><th className="text-left p-2">Vendedor</th><th className="text-left p-2">Código</th><th className="text-right p-2">Clics</th><th className="text-right p-2">Ventas</th><th className="text-right p-2">Comisión (%)</th><th className="text-right p-2">Por pagar</th><th className="text-right p-2">Acción</th></tr>
                </thead>
                <tbody>
                  {approved.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin vendedores aprobados.</td></tr>}
                  {approved.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2 text-foreground">{a.full_name}<div className="text-xs text-muted-foreground">{a.email}</div></td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{a.code}</td>
                      <td className="p-2 text-right text-foreground">{a.total_clicks}</td>
                      <td className="p-2 text-right text-foreground">${Number(a.total_sales).toLocaleString()}</td>
                      <td className="p-2 text-right text-foreground">{a.commission_pct}%</td>
                      <td className="p-2 text-right text-secondary font-bold">${Number(a.pending_payout).toLocaleString()}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="outline" disabled={!Number(a.pending_payout)} onClick={() => markPaid(a)} className="gap-1">
                          <Wallet className="h-3.5 w-3.5" />Marcar pagado
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliatesSection;

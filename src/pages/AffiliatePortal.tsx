import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, MousePointerClick, ShoppingBag, Wallet, LogOut, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const AffiliatePortal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aff, setAff] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [clicks, setClicks] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/portal-vendedores/login'); return; }
      const { data: a } = await supabase.from('affiliates').select('*').eq('user_id', user.id).maybeSingle();
      if (!a) { navigate('/portal-vendedores/login'); return; }
      setAff(a);
      const { data: s } = await supabase.from('affiliate_sales').select('*').eq('affiliate_id', a.id).order('created_at', { ascending: false });
      setSales(s ?? []);
      const { count } = await supabase.from('affiliate_clicks').select('*', { count: 'exact', head: true }).eq('affiliate_id', a.id);
      setClicks(count ?? 0);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const link = `${window.location.origin}/tienda?ref=${aff.code}`;
  const closed = sales.filter((s: any) => s.status !== 'rejected').length;
  const pending = Number(aff.pending_payout || 0);

  if (aff.status !== 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md bg-card border-border">
          <CardContent className="p-8 text-center space-y-3">
            <Briefcase className="h-10 w-10 text-secondary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Cuenta {aff.status === 'pending' ? 'en revisión' : 'rechazada'}</h1>
            <p className="text-sm text-muted-foreground">
              {aff.status === 'pending' ? 'Un administrador aprobará tu solicitud pronto.' : 'Contacta al equipo para más detalles.'}
            </p>
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate('/portal-vendedores/login'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 flex items-center border-b border-border px-4 gap-3">
        <span className="text-sm text-muted-foreground font-medium">WAXAPP<span className="text-primary">.</span> Portal Vendedores</span>
        <div className="ml-auto"><Button variant="ghost" size="sm" className="gap-2" onClick={async () => { await supabase.auth.signOut(); navigate('/portal-vendedores/login'); }}><LogOut className="h-4 w-4" />Salir</Button></div>
      </header>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hola, {aff.full_name}</h1>
          <p className="text-sm text-muted-foreground">Comisión: <strong className="text-primary">{aff.commission_pct}%</strong> · Estado: <Badge className="bg-primary/15 text-primary border-primary/30 ml-1">Aprobado</Badge></p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground text-base">Mi link de afiliado único</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <input readOnly value={link} className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground" />
            <Button onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado'); }} className="gap-2"><Copy className="h-4 w-4" />Copiar</Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border"><CardContent className="p-4 text-center"><MousePointerClick className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Clics en mi link</p><p className="text-2xl font-bold text-foreground">{clicks.toLocaleString()}</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4 text-center"><ShoppingBag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Ventas cerradas</p><p className="text-2xl font-bold text-foreground">{closed}</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4 text-center"><Wallet className="h-5 w-5 mx-auto mb-1 text-secondary" /><p className="text-xs text-muted-foreground">Comisiones por cobrar</p><p className="text-2xl font-bold text-secondary">${pending.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Mis Ventas Generadas</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Fórmulas: <span className="font-mono">Utilidad = Total − Envío − Impuestos</span> · <span className="font-mono">Comisión = Utilidad × {aff.commission_pct}%</span>
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr><th className="text-left p-2">Pedido</th><th className="text-right p-2">Total</th><th className="text-right p-2">Envío</th><th className="text-right p-2">Imp.</th><th className="text-right p-2">Utilidad</th><th className="text-right p-2">Comisión {aff.commission_pct}%</th><th className="text-left p-2">Estado</th></tr>
              </thead>
              <tbody>
                {sales.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aún no tienes ventas.</td></tr>}
                {sales.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 font-mono text-foreground">{s.order_number || s.order_id?.slice(0, 8)}</td>
                    <td className="p-2 text-right text-foreground">${Number(s.gross).toLocaleString()}</td>
                    <td className="p-2 text-right text-muted-foreground">${Number(s.shipping).toLocaleString()}</td>
                    <td className="p-2 text-right text-muted-foreground">${Number(s.tax).toLocaleString()}</td>
                    <td className="p-2 text-right text-foreground font-semibold">${Number(s.net_profit).toLocaleString()}</td>
                    <td className="p-2 text-right text-primary font-bold">${Number(s.commission).toLocaleString()}</td>
                    <td className="p-2"><Badge className={s.status === 'paid' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary/20 text-secondary border-secondary/30'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AffiliatePortal;

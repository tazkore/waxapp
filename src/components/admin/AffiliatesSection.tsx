import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AffiliatesSection = () => {
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('affiliates').select('*').order('created_at', { ascending: false });
    setAffiliates(data ?? []);
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const pending = affiliates.filter((a) => a.status === 'pending');
  const approved = affiliates.filter((a) => a.status === 'approved');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Afiliados / Vendedores</h1>

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

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-foreground text-base">Vendedores activos & pagos pendientes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr><th className="text-left p-2">Vendedor</th><th className="text-left p-2">Código</th><th className="text-right p-2">Clics</th><th className="text-right p-2">Ventas</th><th className="text-right p-2">Comisión {`(% )`}</th><th className="text-right p-2">Por pagar</th><th className="text-right p-2">Acción</th></tr>
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
    </div>
  );
};

export default AffiliatesSection;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import AdminNotifications from './AdminNotifications';

interface Stats {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  pending: number;
  byGateway: Record<string, { count: number; total: number }>;
  byStatus: Record<string, number>;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const PaymentsDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('payment_transactions')
        .select('amount, status, gateway_slug, paid_at, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const s: Stats = {
        todayTotal: 0, weekTotal: 0, monthTotal: 0, pending: 0,
        byGateway: {}, byStatus: {},
      };

      (data ?? []).forEach((t: any) => {
        const dt = new Date(t.paid_at ?? t.created_at);
        const amt = Number(t.amount ?? 0);

        s.byStatus[t.status] = (s.byStatus[t.status] ?? 0) + 1;
        if (t.status === 'pending') s.pending += 1;

        if (t.status === 'paid') {
          if (dt >= startToday) s.todayTotal += amt;
          if (dt >= startWeek) s.weekTotal += amt;
          if (dt >= startMonth) s.monthTotal += amt;
          const g = t.gateway_slug ?? 'otro';
          s.byGateway[g] = s.byGateway[g] ?? { count: 0, total: 0 };
          s.byGateway[g].count += 1;
          s.byGateway[g].total += amt;
        }
      });

      setStats(s);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Cobrado hoy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(stats.todayTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Últimos 7 días</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(stats.weekTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Mes en curso</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(stats.monthTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-500">{stats.pending}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Por pasarela (cobrado)</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(stats.byGateway).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos cobrados aún.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byGateway).map(([slug, v]) => (
                  <div key={slug} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <span className="font-medium capitalize">{slug.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{v.count} · <span className="text-foreground font-semibold">{fmt(v.total)}</span></span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Por estado</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="capitalize">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentsDashboard;

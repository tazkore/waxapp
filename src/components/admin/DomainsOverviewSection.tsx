import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

type OrderRow = { total: number; status: string; origin_domain: string | null; created_at: string };
type Range = '7d' | '30d' | '90d' | 'all';

const STATUSES = ['pending', 'packed', 'shipped', 'delivered', 'refunded'] as const;
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-secondary/20 text-secondary border-secondary/30',
  packed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-primary/20 text-primary border-primary/30',
  refunded: 'bg-destructive/20 text-destructive border-destructive/30',
};

const rangeStart = (r: Range): Date | null => {
  if (r === 'all') return null;
  const days = r === '7d' ? 7 : r === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const DomainsOverviewSection = () => {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('total, status, origin_domain, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (!cancelled) {
        setRows((data ?? []) as OrderRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    return start ? rows.filter((r) => new Date(r.created_at) >= start) : rows;
  }, [rows, range]);

  const groups = useMemo(() => {
    const map = new Map<string, { domain: string; count: number; revenue: number; statuses: Record<string, number> }>();
    for (const r of filtered) {
      const key = r.origin_domain || 'Sin dominio';
      const g = map.get(key) ?? { domain: key, count: 0, revenue: 0, statuses: {} };
      g.count += 1;
      g.revenue += Number(r.total || 0);
      g.statuses[r.status] = (g.statuses[r.status] || 0) + 1;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const totalRevenue = groups.reduce((s, g) => s + g.revenue, 0);
  const top = groups[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Resumen por Dominio
          </h2>
          <p className="text-sm text-muted-foreground">Compara ventas, ticket promedio y estados por marca/dominio.</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as Range[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r === 'all' ? 'Todo' : r}
            </Button>
          ))}
        </div>
      </div>

      {top && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Dominio top
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{top.domain}</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${top.revenue.toLocaleString()} MXN en {top.count} pedidos · ticket promedio ${(top.revenue / top.count).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aún no hay pedidos con dominio registrado en este rango.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Dominio</TableHead>
                <TableHead className="text-muted-foreground text-right">Pedidos</TableHead>
                <TableHead className="text-muted-foreground text-right">Ventas (MXN)</TableHead>
                <TableHead className="text-muted-foreground text-right">Ticket prom.</TableHead>
                <TableHead className="text-muted-foreground text-right">% del total</TableHead>
                <TableHead className="text-muted-foreground">Estados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => {
                const avg = g.count > 0 ? g.revenue / g.count : 0;
                const share = totalRevenue > 0 ? (g.revenue / totalRevenue) * 100 : 0;
                return (
                  <TableRow key={g.domain} className="border-border">
                    <TableCell className="font-medium text-foreground">{g.domain}</TableCell>
                    <TableCell className="text-right text-foreground">{g.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-foreground font-semibold">
                      ${g.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{share.toFixed(1)}%</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.filter((s) => g.statuses[s]).map((s) => (
                          <Badge key={s} variant="outline" className={STATUS_COLOR[s]}>
                            {s} · {g.statuses[s]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DomainsOverviewSection;

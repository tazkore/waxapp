import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { salesChartData } from '@/data/dashboardData';

const OverviewSection = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalSales: 0, activeOrders: 0, totalClients: 0, totalProducts: 0 });

  useEffect(() => {
    const fetchKpis = async () => {
      const [ordersRes, clientsRes, productsRes] = await Promise.all([
        supabase.from('orders').select('total, status'),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      const orders = ordersRes.data ?? [];
      const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const activeOrders = orders.filter(o => o.status !== 'delivered').length;

      setKpis({
        totalSales,
        activeOrders,
        totalClients: clientsRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
      });
      setLoading(false);
    };
    fetchKpis();
  }, []);

  const kpiCards = [
    { label: 'Ventas Totales', value: `$${kpis.totalSales.toLocaleString()} MXN`, icon: DollarSign, color: 'text-primary' },
    { label: 'Pedidos Activos', value: kpis.activeOrders, icon: ShoppingCart, color: 'text-secondary' },
    { label: 'Clientes Registrados', value: kpis.totalClients, icon: Users, color: 'text-foreground' },
    { label: 'Productos', value: kpis.totalProducts, icon: TrendingUp, color: 'text-foreground' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Vista General</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="bg-card border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Ventas — Últimos 7 Días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="day" stroke="hsl(240 4% 66%)" fontSize={12} />
                <YAxis stroke="hsl(240 4% 66%)" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: 8, color: 'hsl(240 5% 96%)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()} MXN`, 'Ventas']}
                />
                <Bar dataKey="ventas" fill="hsl(145 100% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewSection;

import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, Activity, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const OverviewSection = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalSales: 0, activeOrders: 0, totalClients: 0, totalProducts: 0, conversionRate: 3.2 });
  const [salesByDay, setSalesByDay] = useState<{ day: string; ventas: number }[]>([]);
  const [liveActivity, setLiveActivity] = useState<{ time: string; message: string; type: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [ordersRes, clientsRes, productsRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at'),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      const orders = ordersRes.data ?? [];
      const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'refunded').length;

      setKpis({
        totalSales,
        activeOrders,
        totalClients: clientsRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        conversionRate: orders.length > 0 ? Math.min(((orders.filter(o => o.status === 'delivered').length / Math.max(orders.length, 1)) * 100), 100) : 0,
      });

      // Build sales by day (last 7 days)
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const salesMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = days[d.getDay()];
        salesMap[key] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 7) {
          const key = days[d.getDay()];
          salesMap[key] = (salesMap[key] || 0) + Number(o.total);
        }
      });
      setSalesByDay(Object.entries(salesMap).map(([day, ventas]) => ({ day, ventas })));

      // Generate simulated live activity
      const activities = [
        { message: 'Alguien agregó Gomitas Artisan al carrito', type: 'cart' },
        { message: 'Nuevo pedido #WX-1029 recibido', type: 'order' },
        { message: 'Cliente María López inició sesión', type: 'login' },
        { message: 'Stock de Vape Cerámica Pro bajo (8 uds)', type: 'stock' },
        { message: 'Nuevo registro: carlos@email.com', type: 'signup' },
        { message: 'Pedido #WX-1025 marcado como enviado', type: 'shipped' },
      ];
      setLiveActivity(activities.map((a, i) => ({
        ...a,
        time: `hace ${i + 1} min`,
      })));

      setLoading(false);
    };
    fetchData();
  }, []);

  const kpiCards = [
    { label: 'Ventas Totales', value: `$${kpis.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Pedidos Activos', value: kpis.activeOrders, icon: ShoppingCart, color: 'text-secondary' },
    { label: 'Tasa de Conversión', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent, color: 'text-primary' },
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Ventas — Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
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

        {/* Live Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Actividad en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    a.type === 'order' ? 'bg-primary' :
                    a.type === 'cart' ? 'bg-secondary' :
                    a.type === 'stock' ? 'bg-destructive' :
                    'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="text-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewSection;

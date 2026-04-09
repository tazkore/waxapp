import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, Activity, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface OverviewSectionProps {
  onNavigate?: (section: string) => void;
}

const OverviewSection = ({ onNavigate }: OverviewSectionProps) => {
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

      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const salesMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        salesMap[days[d.getDay()]] = 0;
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

      setLiveActivity([
        { message: 'Alguien agregó Gomitas Artisan al carrito', type: 'cart', time: 'hace 1 min' },
        { message: 'Nuevo pedido #WX-1029 recibido', type: 'order', time: 'hace 2 min' },
        { message: 'Cliente María López inició sesión', type: 'login', time: 'hace 3 min' },
        { message: 'Stock de Vape Cerámica Pro bajo (8 uds)', type: 'stock', time: 'hace 4 min' },
        { message: 'Nuevo registro: carlos@email.com', type: 'signup', time: 'hace 5 min' },
        { message: 'Pedido #WX-1025 marcado como enviado', type: 'shipped', time: 'hace 6 min' },
      ]);

      setLoading(false);
    };
    fetchData();
  }, []);

  const kpiCards = [
    { label: 'Ventas Totales', value: `$${kpis.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-primary', section: 'orders' },
    { label: 'Pedidos Activos', value: kpis.activeOrders, icon: ShoppingCart, color: 'text-secondary', section: 'orders' },
    { label: 'Tasa de Conversión', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent, color: 'text-primary', section: 'clients' },
    { label: 'Productos', value: kpis.totalProducts, icon: TrendingUp, color: 'text-foreground', section: 'inventory' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Vista General</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card
            key={k.label}
            className={`bg-card border-border ${onNavigate ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}
            onClick={() => onNavigate?.(k.section)}
          >
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

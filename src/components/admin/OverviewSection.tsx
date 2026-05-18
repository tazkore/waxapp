import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Loader2, Percent, Package, CalendarDays, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface OverviewSectionProps {
  onNavigate?: (section: string) => void;
}

type Period = '7d' | '30d' | '90d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  all: 'Todo el tiempo',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  packed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  refunded: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  packed: 'Empacado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  refunded: 'Reembolsado',
};

const OverviewSection = ({ onNavigate }: OverviewSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [orders, setOrders] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [ordersRes, clientsRes, productsRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at, items'),
        supabase.from('customer_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);
      setOrders(ordersRes.data ?? []);
      setClientCount(clientsRes.count ?? 0);
      setProductCount(productsRes.count ?? 0);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredOrders = useMemo(() => {
    if (period === 'all') return orders;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  const kpis = useMemo(() => {
    const totalSales = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
    const activeOrders = filteredOrders.filter(o => o.status !== 'delivered' && o.status !== 'refunded').length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const conversionRate = filteredOrders.length > 0 ? (delivered / filteredOrders.length) * 100 : 0;
    const avgTicket = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;
    return { totalSales, activeOrders, conversionRate, avgTicket, totalOrders: filteredOrders.length };
  }, [filteredOrders]);

  // Sales trend chart data
  const salesTrend = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const bucketCount = Math.min(days, period === '7d' ? 7 : period === '30d' ? 30 : 12);
    const bucketSize = Math.max(1, Math.floor(days / bucketCount));
    const now = new Date();
    const buckets: { label: string; ventas: number; pedidos: number }[] = [];

    for (let i = bucketCount - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - (i + 1) * bucketSize);
      const end = new Date(now);
      end.setDate(end.getDate() - i * bucketSize);

      const inBucket = filteredOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d < end;
      });

      const label = bucketSize <= 1
        ? start.toLocaleDateString('es-MX', { weekday: 'short' })
        : bucketSize <= 7
          ? `${start.getDate()}/${start.getMonth() + 1}`
          : start.toLocaleDateString('es-MX', { month: 'short' });

      buckets.push({
        label,
        ventas: inBucket.reduce((s, o) => s + Number(o.total), 0),
        pedidos: inBucket.length,
      });
    }
    return buckets;
  }, [filteredOrders, period]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const name = item.title || item.name || 'Desconocido';
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty += Number(item.qty || 1);
        map[name].revenue += Number(item.price || 0) * Number(item.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredOrders]);

  // Order status distribution
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS[status] ?? '#6b7280',
    }));
  }, [filteredOrders]);

  const kpiCards = [
    { label: 'Ventas del Período', value: `$${kpis.totalSales.toLocaleString('es-MX')}`, icon: DollarSign, color: 'text-primary', section: 'orders' },
    { label: 'Pedidos', value: kpis.totalOrders, icon: ShoppingCart, color: 'text-blue-400', section: 'orders' },
    { label: 'Clientes Registrados', value: clientCount, icon: Users, color: 'text-purple-400', section: 'clients' },
    { label: 'Productos Activos', value: productCount, icon: Package, color: 'text-orange-400', section: 'products' },
    { label: 'Pedidos Activos', value: kpis.activeOrders, icon: TrendingUp, color: 'text-primary', section: 'orders' },
    { label: 'Ticket Promedio', value: `$${kpis.avgTicket.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-foreground', section: 'orders' },
    { label: 'Tasa de Entrega', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Percent, color: 'text-primary', section: 'clients' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Header with period selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-48 bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiCards.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card
              className={`bg-card border-border h-full ${onNavigate ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
              onClick={() => onNavigate?.(k.section)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted shrink-0">
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sales Trend Line Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Tendencia de Ventas — {PERIOD_LABELS[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                  <XAxis dataKey="label" stroke="hsl(240 4% 66%)" fontSize={12} />
                  <YAxis stroke="hsl(240 4% 66%)" fontSize={12} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: 8, color: 'hsl(240 5% 96%)' }}
                    formatter={(value: number, name: string) => [
                      name === 'ventas' ? `$${value.toLocaleString()} MXN` : value,
                      name === 'ventas' ? 'Ventas' : 'Pedidos',
                    ]}
                  />
                  <Legend formatter={(v) => v === 'ventas' ? 'Ventas ($)' : 'Pedidos'} />
                  <Line type="monotone" dataKey="ventas" stroke="hsl(145 100% 45%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="pedidos" stroke="hsl(260 80% 60%)" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Sin datos para este período</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Top Products + Status Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(240 4% 66%)" fontSize={12} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <YAxis type="category" dataKey="name" stroke="hsl(240 4% 66%)" fontSize={11} width={140} tick={{ fill: 'hsl(240 5% 96%)' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: 8, color: 'hsl(240 5% 96%)' }}
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? `$${value.toLocaleString()} MXN` : `${value} uds`,
                        name === 'revenue' ? 'Ingresos' : 'Cantidad',
                      ]}
                    />
                    <Bar dataKey="revenue" fill="hsl(145 100% 45%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Sin datos de productos</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Pie */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Estado de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {statusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={11}
                    >
                      {statusDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: 8, color: 'hsl(240 5% 96%)' }}
                      formatter={(value: number) => [`${value} pedidos`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Sin pedidos</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Clientes</p>
            <p className="text-2xl font-bold text-foreground">{clientCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Productos</p>
            <p className="text-2xl font-bold text-foreground">{productCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Pedidos Activos</p>
            <p className="text-2xl font-bold text-secondary">{kpis.activeOrders}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewSection;

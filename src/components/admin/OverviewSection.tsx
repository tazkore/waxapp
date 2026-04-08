import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { kpiData, salesChartData } from '@/data/dashboardData';

const kpis = [
  { label: 'Ventas del Mes', value: `$${kpiData.salesMonth.toLocaleString()} MXN`, icon: DollarSign, color: 'text-primary' },
  { label: 'Pedidos Activos', value: kpiData.activeOrders, icon: ShoppingCart, color: 'text-secondary' },
  { label: 'Usuarios Registrados', value: kpiData.registeredUsers.toLocaleString(), icon: Users, color: 'text-foreground' },
  { label: 'Tasa de Conversión', value: `${kpiData.conversionRate}%`, icon: TrendingUp, color: 'text-foreground' },
];

const OverviewSection = () => (
  <div className="space-y-8">
    <h1 className="text-2xl font-bold text-foreground">Vista General</h1>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
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

export default OverviewSection;

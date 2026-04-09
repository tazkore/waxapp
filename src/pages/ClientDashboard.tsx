import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, User, Save, ArrowLeft, Package, Truck } from 'lucide-react';

const countries = [
  'México', 'Estados Unidos', 'España', 'Colombia', 'Argentina', 'Chile',
  'Perú', 'Ecuador', 'Venezuela', 'Guatemala', 'Cuba', 'Bolivia',
  'República Dominicana', 'Honduras', 'Paraguay', 'El Salvador',
  'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay', 'Puerto Rico', 'Otro',
];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-secondary/20 text-secondary border-secondary/30' },
  packed: { label: 'Empacado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  shipped: { label: 'Enviado', color: 'bg-primary/20 text-primary border-primary/30' },
  delivered: { label: 'Entregado', color: 'bg-primary/20 text-primary border-primary/30' },
  refunded: { label: 'Reembolsado', color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const ClientDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('orders');
  const [form, setForm] = useState({ full_name: '', phone: '', country: '', address: '', city: '', state: '', postal_code: '' });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/cliente'); return; }

      const { data } = await supabase.from('customer_profiles').select('*').eq('user_id', user.id).single();
      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          country: data.country || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
        });
      }

      // Fetch orders by email
      if (user.email) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_email', user.email)
          .order('created_at', { ascending: false });
        setOrders(orderData ?? []);
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!form.phone || !form.country || !form.full_name) {
      toast({ title: 'Campos requeridos', description: 'Nombre, teléfono y país son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('customer_profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      country: form.country,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      postal_code: form.postal_code || null,
    }).eq('id', profile.id);

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Perfil actualizado' });
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 flex items-center border-b border-border px-4 gap-3">
        <Link to="/" className="text-foreground hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm text-muted-foreground font-medium">
          WAXAPP<span className="text-primary">.</span> Mi Cuenta
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile?.full_name}</h1>
            <p className="text-sm text-muted-foreground">{profile?.country}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />Mis Pedidos
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />Mis Datos
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aún no tienes pedidos.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Ir a la Tienda</Button>
              </div>
            ) : (
              orders.map((order) => {
                const status = statusLabels[order.status] ?? statusLabels.pending;
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <Card key={order.id} className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-foreground">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <div className="space-y-1">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.title} x{item.qty}{item.variant ? ` (${item.variant})` : ''}</span>
                            <span className="text-foreground">${(item.price * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-sm font-medium text-foreground">Total</span>
                        <span className="font-bold text-foreground">${order.total.toLocaleString()} MXN</span>
                      </div>
                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Truck className="h-4 w-4" />
                          <span>Guía: {order.tracking_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Mis Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="bg-muted border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Teléfono *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-muted border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">País *</Label>
                <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Selecciona tu país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Dirección</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-foreground">Ciudad</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Estado</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-muted border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Código Postal</Label>
                <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="bg-muted border-border" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClientDashboard;

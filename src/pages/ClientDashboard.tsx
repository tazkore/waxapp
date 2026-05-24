import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, Save, ArrowLeft, Package, Truck, Sparkles, Copy, Gift, MapPin } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import ProfileSidebar from '@/components/ProfileSidebar';
import AvatarUpload from '@/components/AvatarUpload';


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

const tierColor: Record<string, string> = {
  Bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  Gold: 'bg-secondary/20 text-secondary border-secondary/30',
  Platinum: 'bg-primary/20 text-primary border-primary/30',
  VIP: 'bg-primary/20 text-primary border-primary/30',
};

type ProfileForm = {
  full_name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
};

type ActiveTab = 'orders' | 'rewards' | 'profile';

const ClientDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');
  const [client, setClient] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { full_name: '', phone: '', country: '', address: '', city: '', state: '', postal_code: '' },
  });
  const countryVal = watch('country');

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate('/cliente'); return; }
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setAvatarUrl(profileData.avatar_url ?? null);
        setValue('full_name', profileData.full_name ?? '');
        setValue('phone', profileData.phone ?? '');
        setValue('country', profileData.country ?? '');
        setValue('address', profileData.address ?? '');
        setValue('city', profileData.city ?? '');
        setValue('state', profileData.state ?? '');
        setValue('postal_code', profileData.postal_code ?? '');
      }

      if (authUser.email) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_email', authUser.email)
          .order('created_at', { ascending: false });
        setOrders(orderData ?? []);

        const { data: clientRow } = await supabase
          .from('clients')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();
        setClient(clientRow);

        const { data: refRows } = await supabase
          .from('wax_referrals').select('*')
          .eq('referrer_user_id', authUser.id)
          .order('created_at', { ascending: false }).limit(5);
        setReferrals(refRows ?? []);
      }

      setLoading(false);
    };
    load();
  }, [navigate, setValue]);

  const generateInviteLink = async () => {
    setGeneratingCode(true);
    try {
      if (!user) throw new Error('No autenticado');
      const code = `WAX-${user.id.slice(0, 8).toUpperCase()}`;
      await supabase.from('wax_referrals').upsert({
        referrer_user_id: user.id,
        referrer_email: user.email!,
        code,
        status: 'pending',
      } as any, { onConflict: 'code' });
      const url = `${window.location.origin}/tienda?ref=${code}`;
      await navigator.clipboard.writeText(url);
      sonnerToast.success('Link de invitación copiado', { description: url });
      const { data: refRows } = await supabase
        .from('wax_referrals').select('*')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false }).limit(5);
      setReferrals(refRows ?? []);
    } catch (e: any) {
      sonnerToast.error(e?.message || 'No se pudo generar el link');
    } finally {
      setGeneratingCode(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setSaving(true);
    try {
      if (profile) {
        const { error } = await supabase
          .from('customer_profiles')
          .update({
            full_name: data.full_name,
            phone: data.phone,
            country: data.country,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            postal_code: data.postal_code || null,
          })
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: user.id,
            full_name: data.full_name,
            phone: data.phone,
            country: data.country,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            postal_code: data.postal_code || null,
          });
        if (error) throw error;
      }
      toast({ title: 'Perfil actualizado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  const navItems = [
    { key: 'orders', label: 'Mis Pedidos', icon: Package, active: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { key: 'rewards', label: 'WAX Points', icon: Sparkles, active: activeTab === 'rewards', onClick: () => setActiveTab('rewards') },
    { key: 'profile', label: 'Mis Datos', icon: MapPin, active: activeTab === 'profile', onClick: () => setActiveTab('profile') },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 flex items-center border-b border-border px-4 gap-3 bg-background/95 sticky top-0 z-20 backdrop-blur-sm">
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Profile Sidebar */}
        <ProfileSidebar
          userId={user?.id ?? ''}
          avatarUrl={avatarUrl}
          name={displayName}
          email={user?.email}
          role="Cliente"
          navItems={navItems}
          onAvatarUpdated={(url) => setAvatarUrl(url)}
          className="hidden md:flex"
        />

        {/* Mobile tab bar */}
        <div className="md:hidden w-full fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                  item.active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto pb-20 md:pb-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-foreground">Mis Pedidos</h2>
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

            {activeTab === 'rewards' && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Mis WAX Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Saldo actual</p>
                    <p className="font-display text-5xl font-bold text-primary mt-1">{(client?.loyalty_points ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Equivale a <span className="text-foreground font-semibold">${(client?.loyalty_points ?? 0).toLocaleString()} MXN</span> de descuento futuro
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">Nivel: <Badge className={tierColor[client?.membership_tier ?? 'Bronze'] ?? ''}>{client?.membership_tier ?? 'Bronze'}</Badge></p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Gift className="h-4 w-4 text-secondary" /> Invita y gana</p>
                    <p className="text-xs text-muted-foreground">Por cada amigo que complete su primera compra obtienes <strong className="text-foreground">100 WAX Points extra</strong>.</p>
                    <Button onClick={generateInviteLink} disabled={generatingCode} className="w-full gap-2 mt-2">
                      {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      Generar link de invitación
                    </Button>
                  </div>
                  {referrals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Últimas invitaciones</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr><th className="text-left p-2 text-muted-foreground">Código</th><th className="text-left p-2 text-muted-foreground">Estado</th><th className="text-left p-2 text-muted-foreground">Fecha</th></tr>
                          </thead>
                          <tbody>
                            {referrals.map((r) => (
                              <tr key={r.id} className="border-t border-border">
                                <td className="p-2 font-mono text-foreground">{r.code}</td>
                                <td className="p-2 text-muted-foreground capitalize">{r.status}</td>
                                <td className="p-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-MX')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'profile' && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Mis Datos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Mobile-only avatar upload section */}
                  <div className="flex md:hidden flex-col items-center justify-center pb-6 border-b border-border/50 mb-6 gap-2">
                    <AvatarUpload
                      userId={user?.id ?? ''}
                      avatarUrl={avatarUrl}
                      name={displayName}
                      role="Cliente"
                      onAvatarUpdated={(url) => setAvatarUrl(url)}
                    />
                    <div className="text-center">
                      <p className="font-semibold text-foreground text-sm leading-tight">{displayName}</p>
                      {user?.email && <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Nombre completo *</Label>
                      <Input
                        {...register('full_name', { required: true })}
                        className="bg-muted border-border"
                      />
                      {errors.full_name && <p className="text-xs text-destructive">Requerido</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Teléfono *</Label>
                      <Input
                        {...register('phone', { required: true })}
                        className="bg-muted border-border"
                      />
                      {errors.phone && <p className="text-xs text-destructive">Requerido</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">País *</Label>
                      <Select
                        value={countryVal}
                        onValueChange={(v) => setValue('country', v, { shouldValidate: true })}
                      >
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Selecciona tu país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.country && <p className="text-xs text-destructive">Requerido</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Dirección</Label>
                      <Input {...register('address')} className="bg-muted border-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-foreground">Ciudad</Label>
                        <Input {...register('city')} className="bg-muted border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Estado</Label>
                        <Input {...register('state')} className="bg-muted border-border" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Código Postal</Label>
                      <Input {...register('postal_code')} className="bg-muted border-border" />
                    </div>
                    <Button type="submit" disabled={saving} className="w-full gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar Cambios
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;

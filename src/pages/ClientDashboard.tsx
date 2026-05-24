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
import { Loader2, LogOut, Save, ArrowLeft, Package, Sparkles, Copy, Gift, MapPin, Search, MessageCircle } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import ProfileSidebar from '@/components/ProfileSidebar';
import AvatarUpload from '@/components/AvatarUpload';
import ClientOrderDetailsSheet from '@/components/ClientOrderDetailsSheet';
import ClientRecommendations from '@/components/ClientRecommendations';

const countries = [
  'México', 'Estados Unidos', 'España', 'Colombia', 'Argentina', 'Chile',
  'Perú', 'Ecuador', 'Venezuela', 'Guatemala', 'Cuba', 'Bolivia',
  'República Dominicana', 'Honduras', 'Paraguay', 'El Salvador',
  'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay', 'Puerto Rico', 'Otro',
];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  packed: { label: 'Empacado', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  shipped: { label: 'Enviado', color: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-500 border-green-500/30' },
  refunded: { label: 'Reembolsado', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  paid: { label: 'Pagado', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
};

const tierColor: Record<string, string> = {
  Bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  Gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
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

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { full_name: '', phone: '', country: '', address: '', city: '', state: '', postal_code: '' },
  });
  const countryVal = watch('country');

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [navigate, setValue]);

  const generateInviteLink = async () => {
    setGeneratingCode(true);
    try {
      if (!user) throw new Error('No autenticado');
      const code = \`WAX-\${user.id.slice(0, 8).toUpperCase()}\`;
      await supabase.from('wax_referrals').upsert({
        referrer_user_id: user.id,
        referrer_email: user.email!,
        code,
        status: 'pending',
      } as any, { onConflict: 'code' });
      const url = \`\${window.location.origin}/tienda?ref=\${code}\`;
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
        const { error } = await supabase.from('customer_profiles').update({
          full_name: data.full_name, phone: data.phone, country: data.country,
          address: data.address || null, city: data.city || null, state: data.state || null, postal_code: data.postal_code || null,
        }).eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customer_profiles').insert({
          user_id: user.id, full_name: data.full_name, phone: data.phone, country: data.country,
          address: data.address || null, city: data.city || null, state: data.state || null, postal_code: data.postal_code || null,
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

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse font-medium tracking-widest text-sm uppercase">Cargando experiencia...</p>
    </div>
  );

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  const navItems = [
    { key: 'orders', label: 'Mis Pedidos', icon: Package, active: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { key: 'rewards', label: 'WAX Points', icon: Sparkles, active: activeTab === 'rewards', onClick: () => setActiveTab('rewards') },
    { key: 'profile', label: 'Mis Datos', icon: MapPin, active: activeTab === 'profile', onClick: () => setActiveTab('profile') },
    { key: 'support', label: 'Soporte', icon: MessageCircle, active: false, onClick: () => window.dispatchEvent(new CustomEvent('open-waxa-chat')) },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient background gradients for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="h-14 flex items-center border-b border-border/50 px-4 gap-3 bg-background/60 sticky top-0 z-20 backdrop-blur-xl">
        <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm text-foreground font-semibold tracking-wide">
          WAXAPP<span className="text-primary">.</span> Mi Cuenta
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 transition-all" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Profile Sidebar */}
        <ProfileSidebar
          userId={user?.id ?? ''}
          avatarUrl={avatarUrl}
          name={displayName}
          email={user?.email}
          role="Cliente"
          navItems={navItems}
          onAvatarUpdated={(url) => setAvatarUrl(url)}
          className="hidden md:flex shrink-0 w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl"
        />

        {/* Mobile tab bar */}
        <div className="md:hidden w-full fixed bottom-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-t border-border/50 flex shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className={\`flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-medium transition-all duration-300 relative \${
                  item.active ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
                }\`}
              >
                {item.active && (
                  <motion.div layoutId="active-nav-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
                )}
                <Icon className={\`h-5 w-5 \${item.active ? 'drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : ''}\`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground font-display">Mis Pedidos</h2>
                      <p className="text-sm text-muted-foreground mt-1">Revisa el estado de tus compras e historial.</p>
                    </div>
                    {orders.length > 0 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar pedido..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary w-full sm:w-64"
                        />
                      </div>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-20 rounded-3xl border border-dashed border-border/60 bg-muted/20">
                      <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50 shadow-inner">
                        <Package className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Aún no tienes pedidos</h3>
                      <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Explora nuestra tienda y descubre los mejores productos premium.</p>
                      <Button className="mt-6 gap-2 shadow-lg shadow-primary/25" onClick={() => navigate('/')}>
                        Ir a la Tienda <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredOrders.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          No se encontraron pedidos con esa búsqueda.
                        </div>
                      )}
                      {filteredOrders.map((order, idx) => {
                        const status = statusLabels[order.status] ?? statusLabels.pending;
                        const items = Array.isArray(order.items) ? order.items : [];
                        return (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <Card 
                              className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)] overflow-hidden relative"
                              onClick={() => { setSelectedOrder(order); setSheetOpen(true); }}
                            >
                              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 text-primary">
                                <ArrowRight className="h-5 w-5" />
                              </div>
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-mono font-bold text-foreground text-lg group-hover:text-primary transition-colors">{order.order_number}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                  <Badge className={\`\${status.color} shadow-sm\`} variant="outline">{status.label}</Badge>
                                </div>
                                <div className="space-y-1.5">
                                  {items.slice(0, 2).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm items-center">
                                      <span className="text-muted-foreground truncate pr-4">{item.qty}x {item.title}</span>
                                      <span className="text-foreground font-medium">\${(item.price * item.qty).toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {items.length > 2 && (
                                    <p className="text-xs text-muted-foreground italic">+ {items.length - 2} producto(s) más</p>
                                  )}
                                </div>
                                <div className="flex justify-between border-t border-border/50 pt-3 items-center">
                                  <span className="text-sm font-medium text-foreground">Total</span>
                                  <span className="font-bold text-foreground text-base">\${order.total.toLocaleString()} MXN</span>
                                </div>
                                {order.status === 'pending' && (
                                  <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 py-1 px-2 rounded w-fit">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                    </span>
                                    Requiere pago (\${order.payment_method?.toUpperCase() || 'TARJETA'})
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Recommendations */}
                  <ClientRecommendations />

                </motion.div>
              )}

              {activeTab === 'rewards' && (
                <motion.div key="rewards" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-bold text-foreground font-display">WAX Points</h2>
                  <Card className="bg-card/40 backdrop-blur-md border-border/50 overflow-hidden shadow-lg shadow-black/5 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <CardHeader className="relative z-10 pb-2">
                      <CardTitle className="text-foreground text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" /> Programa de Lealtad
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Saldo disponible</p>
                        <p className="font-display text-6xl md:text-7xl font-bold text-foreground tracking-tight drop-shadow-sm">
                          {(client?.loyalty_points ?? 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground mt-3">
                          Equivale a <span className="text-foreground font-bold">\${(client?.loyalty_points ?? 0).toLocaleString()} MXN</span> de descuento
                        </p>
                        <div className="mt-4">
                          <Badge className={\`\${tierColor[client?.membership_tier ?? 'Bronze'] ?? ''} text-sm px-3 py-1 shadow-sm\`}>Nivel: {client?.membership_tier ?? 'Bronze'}</Badge>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
                        <div>
                          <p className="text-lg font-bold text-foreground flex items-center gap-2 mb-1"><Gift className="h-5 w-5 text-primary" /> Invita y gana</p>
                          <p className="text-sm text-muted-foreground">Por cada amigo que complete su primera compra obtienes <strong className="text-foreground">100 WAX Points</strong>.</p>
                        </div>
                        <Button onClick={generateInviteLink} disabled={generatingCode} size="lg" className="w-full md:w-auto shrink-0 gap-2 shadow-lg shadow-primary/20">
                          {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                          Generar link de invitación
                        </Button>
                      </div>
                      
                      {referrals.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Últimas invitaciones</p>
                          <div className="rounded-xl border border-border/50 overflow-hidden bg-background/40">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 border-b border-border/50">
                                <tr>
                                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Código</th>
                                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Estado</th>
                                  <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Fecha</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {referrals.map((r) => (
                                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="py-3 px-4 font-mono text-foreground font-medium">{r.code}</td>
                                    <td className="py-3 px-4 text-muted-foreground capitalize">
                                      <Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                        {r.status}
                                      </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{new Date(r.created_at).toLocaleDateString('es-MX')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-bold text-foreground font-display">Mis Datos</h2>
                  <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="border-b border-border/50 bg-muted/10">
                      <CardTitle className="text-foreground text-base flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" /> Información Personal y de Envío
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Mobile-only avatar upload section */}
                      <div className="flex md:hidden flex-col items-center justify-center pb-8 border-b border-border/50 mb-8 gap-3">
                        <AvatarUpload
                          userId={user?.id ?? ''}
                          avatarUrl={avatarUrl}
                          name={displayName}
                          role="Cliente"
                          onAvatarUpdated={(url) => setAvatarUrl(url)}
                        />
                        <div className="text-center">
                          <p className="font-bold text-foreground text-lg leading-tight">{displayName}</p>
                          {user?.email && <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>}
                        </div>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Nombre completo *</Label>
                            <Input {...register('full_name', { required: true })} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" />
                            {errors.full_name && <p className="text-xs text-destructive">Requerido</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Teléfono *</Label>
                            <Input {...register('phone', { required: true })} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" />
                            {errors.phone && <p className="text-xs text-destructive">Requerido</p>}
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider mt-2 block">País *</Label>
                          <Select value={countryVal} onValueChange={(v) => setValue('country', v, { shouldValidate: true })}>
                            <SelectTrigger className="bg-background/50 border-border/50 h-11">
                              <SelectValue placeholder="Selecciona tu país" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {errors.country && <p className="text-xs text-destructive">Requerido</p>}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Dirección completa</Label>
                          <Input {...register('address')} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" placeholder="Calle, número, colonia..." />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Ciudad</Label>
                            <Input {...register('city')} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Estado</Label>
                            <Input {...register('state')} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" />
                          </div>
                          <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">C.P.</Label>
                            <Input {...register('postal_code')} className="bg-background/50 border-border/50 focus-visible:ring-primary h-11" />
                          </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                          <Button type="submit" disabled={saving} size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar Cambios
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <ClientOrderDetailsSheet 
        order={selectedOrder} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        onOrderUpdated={loadData}
      />
    </div>
  );
};

export default ClientDashboard;

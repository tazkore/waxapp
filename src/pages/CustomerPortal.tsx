import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  LogOut,
  Save,
  Copy,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowLeft,
  Sparkles,
  Gift,
  Star,
  ChevronRight,
  User,
  Settings,
  Heart,
  Printer,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type PortalTab = 'pedidos' | 'preferencias' | 'perfil';

type ProfileForm = {
  full_name: string;
  phone: string;
  country: string;
};

type Preferences = {
  flavorPreference: 'frutas' | 'mentol' | 'dulce' | 'tabaco' | 'sin_sabor' | '';
  productType: 'desechables' | 'pods' | 'cartucho' | 'accesorios' | '';
  purchaseFrequency: 'semanal' | 'quincenal' | 'mensual' | 'ocasional' | '';
  priceRange: 'economico' | 'medio' | 'premium' | '';
};

// ──────────────────────────────────────────────────────────────────────────────
// Static data
// ──────────────────────────────────────────────────────────────────────────────

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

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Pendiente', Icon: Clock },
  { key: 'paid', label: 'Pagado', Icon: CreditCard },
  { key: 'packed', label: 'Empacado', Icon: Package },
  { key: 'shipped', label: 'Enviado', Icon: Truck },
  { key: 'delivered', label: 'Entregado', Icon: CheckCircle2 },
] as const;

const STATUS_ORDER: Record<string, number> = {
  pending: 0, paid: 1, packed: 2, shipped: 3, delivered: 4,
};

// ──────────────────────────────────────────────────────────────────────────────
// Preference questions
// ──────────────────────────────────────────────────────────────────────────────

const FLAVOR_OPTIONS = [
  { value: 'frutas', label: '🍓 Frutas', desc: 'Tropicales y del bosque' },
  { value: 'mentol', label: '🧊 Mentol', desc: 'Frío e intenso' },
  { value: 'dulce', label: '🍬 Dulce', desc: 'Postres y caramelo' },
  { value: 'tabaco', label: '🚬 Tabaco', desc: 'Clásico y robusto' },
  { value: 'sin_sabor', label: '⚪ Sin sabor', desc: 'Natural y limpio' },
];

const PRODUCT_OPTIONS = [
  { value: 'desechables', label: '💨 Desechables', desc: 'Práctico y listo' },
  { value: 'pods', label: '🔋 Pods', desc: 'Recargable y económico' },
  { value: 'cartucho', label: '🛢️ Cartucho', desc: 'Potencia y sabor' },
  { value: 'accesorios', label: '🔧 Accesorios', desc: 'Personaliza tu setup' },
];

const FREQ_OPTIONS = [
  { value: 'semanal', label: '📅 Semanal', desc: 'Cada semana' },
  { value: 'quincenal', label: '🗓️ Quincenal', desc: 'Cada 2 semanas' },
  { value: 'mensual', label: '📆 Mensual', desc: 'Una vez al mes' },
  { value: 'ocasional', label: '✨ Ocasional', desc: 'Cuando se antoja' },
];

const PRICE_OPTIONS = [
  { value: 'economico', label: '💰 Económico', desc: 'Hasta $300 MXN' },
  { value: 'medio', label: '💳 Medio', desc: '$300 – $700 MXN' },
  { value: 'premium', label: '⭐ Premium', desc: 'Más de $700 MXN' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

const OrderTimeline = ({ status }: { status: string }) => {
  const currentIdx = STATUS_ORDER[status] ?? 0;
  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto py-2">
      {TIMELINE_STEPS.map(({ key, label, Icon }, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted border-border text-muted-foreground'
                } ${active ? 'animate-pulse shadow-lg shadow-primary/30' : ''}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-[9px] font-semibold text-center leading-tight ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full ${idx < currentIdx ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Voucher Modal
// ──────────────────────────────────────────────────────────────────────────────

const VoucherModal = ({
  open,
  onOpenChange,
  voucher,
  order,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  voucher: any;
  order: any;
}) => {
  const ref = voucher?.reference_number || `WAX-${order?.order_number || 'REF'}`;
  const expiry = voucher?.expiration_date
    ? new Date(voucher.expiration_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'No disponible';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Printer className="h-5 w-5 text-primary" /> Ficha de Pago
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pedido</span>
              <span className="font-mono font-bold text-foreground">{order?.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">${order?.total?.toLocaleString()} MXN</span>
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-1">Referencia de pago</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-foreground tracking-widest">{ref}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => { navigator.clipboard.writeText(ref); sonnerToast.success('Referencia copiada'); }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {voucher?.barcode_url ? (
              <img src={voucher.barcode_url} alt="Barcode" className="w-full h-16 object-contain mt-2 rounded" />
            ) : (
              <div className="h-16 mt-2 rounded bg-muted border border-dashed border-border/60 flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-mono tracking-widest">{ref}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Vence</span>
              <span className="text-foreground font-medium">{expiry}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {order?.payment_method === 'oxxo'
              ? 'Presenta esta referencia en cualquier tienda OXXO.'
              : 'Realiza tu transferencia SPEI con la referencia indicada.'}
          </p>
          <Button onClick={() => window.print()} variant="outline" className="w-full gap-2">
            <Printer className="h-4 w-4" /> Imprimir ficha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Option Card for Preferences
// ──────────────────────────────────────────────────────────────────────────────

const OptionCard = ({
  option,
  selected,
  onClick,
}: {
  option: { value: string; label: string; desc: string };
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
      selected
        ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
        : 'border-border/50 bg-card/30 hover:border-primary/40 hover:bg-card/50'
    }`}
  >
    <div className="text-base font-semibold text-foreground">{option.label}</div>
    <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
    {selected && <div className="mt-1.5 h-1 w-8 bg-primary rounded-full" />}
  </button>
);

// ──────────────────────────────────────────────────────────────────────────────
// CustomerPortal
// ──────────────────────────────────────────────────────────────────────────────

const CustomerPortal = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<PortalTab>('pedidos');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [voucherModalOrder, setVoucherModalOrder] = useState<any | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    flavorPreference: '',
    productType: '',
    purchaseFrequency: '',
    priceRange: '',
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { full_name: '', phone: '', country: '' },
  });
  const countryVal = watch('country');

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/cliente?redirect=/mi-espacio');
      return;
    }
    setUser(authUser);

    const { data: profileData } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      setValue('full_name', profileData.full_name ?? '');
      setValue('phone', profileData.phone ?? '');
      setValue('country', profileData.country ?? '');
      const savedPrefs = profileData.preferences as any;
      if (savedPrefs && typeof savedPrefs === 'object') {
        setPrefs({
          flavorPreference: savedPrefs.flavorPreference ?? '',
          productType: savedPrefs.productType ?? '',
          purchaseFrequency: savedPrefs.purchaseFrequency ?? '',
          priceRange: savedPrefs.priceRange ?? '',
        });
      }
    }

    if (authUser.email) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, payment_vouchers(*)')
        .eq('customer_email', authUser.email)
        .order('created_at', { ascending: false });
      setOrders(orderData ?? []);
    }
  }, [navigate, setValue]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      if (profile) {
        const { error } = await supabase
          .from('customer_profiles')
          .update({ full_name: data.full_name, phone: data.phone, country: data.country })
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_profiles')
          .insert({ user_id: user.id, full_name: data.full_name, phone: data.phone, country: data.country });
        if (error) throw error;
      }
      toast({ title: 'Perfil actualizado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      if (profile) {
        const { error } = await supabase
          .from('customer_profiles')
          .update({ preferences: prefs as any })
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { data: newProfile, error } = await supabase
          .from('customer_profiles')
          .insert({ user_id: user.id, preferences: prefs as any })
          .select()
          .single();
        if (error) throw error;
        setProfile(newProfile);
      }
      sonnerToast.success('¡Perfil de gustos guardado!', { description: 'Tus preferencias han sido guardadas.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Nav items ──────────────────────────────────────────────────────────────

  const navItems: { key: PortalTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'pedidos', label: 'Mis Pedidos', Icon: Package },
    { key: 'preferencias', label: 'Preferencias', Icon: Heart },
    { key: 'perfil', label: 'Mi Perfil', Icon: User },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm uppercase tracking-widest font-medium">
          Cargando tu espacio...
        </p>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const voucherOrder = voucherModalOrder;
  const voucherRecord = voucherOrder?.payment_vouchers?.[0] ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="h-14 flex items-center border-b border-border/50 px-4 gap-3 bg-background/60 sticky top-0 z-20 backdrop-blur-xl">
        <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-semibold tracking-wide text-foreground">
          WAXAPP<span className="text-primary">.</span> Mi Espacio
        </span>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col shrink-0 w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl p-4 gap-2">
          <div className="mb-4 px-3">
            <p className="font-bold text-foreground text-base">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          {navItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {activeTab === key && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden w-full fixed bottom-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-t border-border/50 flex shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)]">
          {navItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-medium transition-all relative ${
                activeTab === key ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === key && (
                <motion.div layoutId="portal-tab-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto pb-28 md:pb-8">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">

              {/* ── TAB: PEDIDOS ───────────────────────────────────────────── */}
              {activeTab === 'pedidos' && (
                <motion.div
                  key="pedidos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-display">Mis Pedidos</h2>
                    <p className="text-sm text-muted-foreground mt-1">Historial y seguimiento de tus compras.</p>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl border border-dashed border-border/60 bg-muted/20">
                      <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                        <Package className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Aún no tienes pedidos</h3>
                      <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">Explora nuestra tienda y realiza tu primera compra.</p>
                      <Button className="mt-6 gap-2 shadow-lg shadow-primary/25" onClick={() => navigate('/')}>
                        Ir a la Tienda
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order, idx) => {
                        const status = statusLabels[order.status] ?? statusLabels.pending;
                        const items: any[] = Array.isArray(order.items) ? order.items : [];
                        const isExpanded = expandedOrder === order.id;
                        const vouchers: any[] = Array.isArray(order.payment_vouchers) ? order.payment_vouchers : [];
                        const hasVoucher = vouchers.length > 0;
                        const isPending = order.status === 'pending';
                        const isOxxoSpei = ['oxxo', 'spei'].includes(order.payment_method ?? '');
                        const isCard = order.payment_method === 'card';

                        return (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                          >
                            <Card className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all overflow-hidden">
                              {/* Card header row */}
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                              >
                                <CardContent className="p-4 sm:p-5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="font-mono font-bold text-foreground text-base hover:text-primary transition-colors">{order.order_number}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {' · '}{items.length} producto{items.length !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`${status.color} shadow-sm`} variant="outline">{status.label}</Badge>
                                      <span className="font-bold text-foreground text-sm">${order.total?.toLocaleString()}</span>
                                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                  </div>
                                  {isPending && (
                                    <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 py-1 px-2 rounded w-fit">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                                      </span>
                                      Requiere pago ({order.payment_method?.toUpperCase() || 'TARJETA'})
                                    </div>
                                  )}
                                </CardContent>
                              </button>

                              {/* Expanded section */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden border-t border-border/50"
                                  >
                                    <div className="p-4 sm:p-5 space-y-5">
                                      {/* Timeline */}
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Estado del Pedido</p>
                                        <OrderTimeline status={order.status} />
                                      </div>

                                      {/* Products */}
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Productos</p>
                                        <div className="space-y-1.5">
                                          {items.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                              <span className="text-muted-foreground truncate pr-4">{item.qty}x {item.title}</span>
                                              <span className="font-medium text-foreground shrink-0">${(item.price * item.qty).toLocaleString()}</span>
                                            </div>
                                          ))}
                                          <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2 mt-2">
                                            <span className="text-foreground">Total</span>
                                            <span className="text-foreground">${order.total?.toLocaleString()} MXN</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Tracking */}
                                      {order.tracking_number && (
                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                              <p className="text-xs text-muted-foreground">Número de rastreo</p>
                                              <p className="font-mono text-sm font-bold text-foreground">{order.tracking_number}</p>
                                            </div>
                                          </div>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                                            onClick={() => { navigator.clipboard.writeText(order.tracking_number); sonnerToast.success('Número copiado'); }}
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}

                                      {/* Actions */}
                                      <div className="flex flex-col sm:flex-row gap-2">
                                        {isPending && isOxxoSpei && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                                            onClick={() => setVoucherModalOrder(order)}
                                          >
                                            <Printer className="h-4 w-4" />
                                            Reimprimir Ficha de Pago
                                          </Button>
                                        )}
                                        {isPending && isCard && (
                                          <Button size="sm" className="gap-2 shadow-md shadow-primary/20" onClick={() => sonnerToast.info('Redirigiendo a pago...')}>
                                            <CreditCard className="h-4 w-4" />
                                            Pagar Ahora con Clip
                                          </Button>
                                        )}
                                        {isPending && (
                                          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Cambiar método de pago
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── TAB: PREFERENCIAS ──────────────────────────────────────── */}
              {activeTab === 'preferencias' && (
                <motion.div
                  key="preferencias"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" /> Mis Preferencias
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Cuéntanos tus gustos para personalizar tu experiencia.</p>
                  </div>

                  {/* Q1: Flavor */}
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <span className="text-primary">01</span> ¿Qué sabor prefieres?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {FLAVOR_OPTIONS.map((opt) => (
                          <OptionCard
                            key={opt.value}
                            option={opt}
                            selected={prefs.flavorPreference === opt.value}
                            onClick={() => setPrefs((p) => ({ ...p, flavorPreference: opt.value as Preferences['flavorPreference'] }))}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Q2: Product Type */}
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <span className="text-primary">02</span> ¿Qué tipo de producto usas?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {PRODUCT_OPTIONS.map((opt) => (
                          <OptionCard
                            key={opt.value}
                            option={opt}
                            selected={prefs.productType === opt.value}
                            onClick={() => setPrefs((p) => ({ ...p, productType: opt.value as Preferences['productType'] }))}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Q3: Frequency */}
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <span className="text-primary">03</span> ¿Con qué frecuencia compras?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {FREQ_OPTIONS.map((opt) => (
                          <OptionCard
                            key={opt.value}
                            option={opt}
                            selected={prefs.purchaseFrequency === opt.value}
                            onClick={() => setPrefs((p) => ({ ...p, purchaseFrequency: opt.value as Preferences['purchaseFrequency'] }))}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Q4: Price Range */}
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <span className="text-primary">04</span> ¿Cuál es tu rango de precio?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {PRICE_OPTIONS.map((opt) => (
                          <OptionCard
                            key={opt.value}
                            option={opt}
                            selected={prefs.priceRange === opt.value}
                            onClick={() => setPrefs((p) => ({ ...p, priceRange: opt.value as Preferences['priceRange'] }))}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    size="lg"
                    className="w-full gap-2 shadow-lg shadow-primary/25"
                    onClick={handleSavePrefs}
                    disabled={savingPrefs}
                  >
                    {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    Guardar mis preferencias
                  </Button>
                </motion.div>
              )}

              {/* ── TAB: PERFIL ────────────────────────────────────────────── */}
              {activeTab === 'perfil' && (
                <motion.div
                  key="perfil"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
                      <User className="h-6 w-6 text-primary" /> Mi Perfil
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Administra tu información personal.</p>
                  </div>

                  <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="border-b border-border/50 bg-muted/10">
                      <CardTitle className="text-foreground text-base flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" /> Información de Cuenta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-5">
                        {/* Email (read-only) */}
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Correo Electrónico</Label>
                          <Input
                            value={user?.email ?? ''}
                            readOnly
                            className="bg-muted/30 border-border/50 text-muted-foreground h-11 cursor-not-allowed"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Nombre Completo *</Label>
                            <Input
                              {...register('full_name', { required: true })}
                              className="bg-background/50 border-border/50 focus-visible:ring-primary h-11"
                            />
                            {errors.full_name && <p className="text-xs text-destructive">Requerido</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">Teléfono</Label>
                            <Input
                              {...register('phone')}
                              className="bg-background/50 border-border/50 focus-visible:ring-primary h-11"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">País</Label>
                          <Select value={countryVal} onValueChange={(v) => setValue('country', v, { shouldValidate: true })}>
                            <SelectTrigger className="bg-background/50 border-border/50 h-11">
                              <SelectValue placeholder="Selecciona tu país" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Button type="submit" disabled={savingProfile} size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20">
                            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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

      {/* Voucher Modal */}
      {voucherModalOrder && (
        <VoucherModal
          open={!!voucherModalOrder}
          onOpenChange={(v) => { if (!v) setVoucherModalOrder(null); }}
          voucher={voucherRecord}
          order={voucherModalOrder}
        />
      )}
    </div>
  );
};

export default CustomerPortal;

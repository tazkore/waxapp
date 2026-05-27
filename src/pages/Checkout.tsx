import { useState, useRef, useEffect } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Package, Truck, CreditCard, MapPin, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import OrderSummary from '@/components/OrderSummary';
import LoyaltyRedeemCard from '@/components/LoyaltyRedeemCard';
import ExitIntentModal from '@/components/cart/ExitIntentModal';



const steps = [
  { id: 1, title: 'Datos de Envío', icon: MapPin },
  { id: 2, title: 'Método de Envío', icon: Truck },
  { id: 3, title: 'Pago', icon: CreditCard },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, discountCode, discountAmount, shippingCost: storeShipping, total: storeTotal, hasInvalidVariants, setCartOpen, loyaltyPointsApplied, clearLoyaltyPoints, extras, tieredDiscountPct } = useCartStore();
  const invalidVariants = hasInvalidVariants();
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const cardFormRef = useRef<HTMLFormElement>(null);

  const [shipping, setShipping] = useState({
    name: '', email: '', phone: '', address: '', address2: '', city: '', state: '', postalCode: '', country: 'México',
  });
  const [cpLoading, setCpLoading] = useState(false);
  const cpDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cpLastLookupRef = useRef<string>('');

  // Auto-complete city/state from Mexican postal code (CP) — debounced
  const lookupPostalCode = async (cp: string) => {
    const clean = cp.replace(/\D/g, '');
    if (clean.length !== 5) return;
    if (cpLastLookupRef.current === clean) return; // avoid duplicate fetch
    cpLastLookupRef.current = clean;
    setCpLoading(true);
    try {
      const res = await fetch(`https://api.zippopotam.us/mx/${clean}`);
      if (!res.ok) throw new Error('CP no encontrado');
      const data = await res.json();
      const place = data?.places?.[0];
      if (place) {
        setShipping(prev => ({
          ...prev,
          city: prev.city || place['place name'] || '',
          state: prev.state || place['state'] || '',
        }));
      }
    } catch {
      cpLastLookupRef.current = ''; // allow retry on failure
      toast({ title: 'Código postal no encontrado', description: 'Completa ciudad y estado manualmente.', variant: 'destructive' });
    } finally {
      setCpLoading(false);
    }
  };

  const scheduleCpLookup = (cp: string) => {
    if (cpDebounceRef.current) clearTimeout(cpDebounceRef.current);
    const clean = cp.replace(/\D/g, '');
    if (clean.length !== 5) return;
    cpDebounceRef.current = setTimeout(() => lookupPostalCode(clean), 400);
  };

  useEffect(() => () => {
    if (cpDebounceRef.current) clearTimeout(cpDebounceRef.current);
  }, []);

  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Auth guard: require login to checkout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
      setAuthChecked(true);
      if (session?.user) {
        setShipping(prev => ({
          ...prev,
          email: prev.email || session.user.email || '',
          name: prev.name || (session.user.user_metadata?.full_name as string) || '',
        }));
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session);
      setAuthChecked(true);
      if (!session) {
        toast({ title: 'Inicia sesión para continuar', description: 'Necesitas una cuenta para completar tu compra.' });
        navigate('/cliente?redirect=/checkout', { replace: true });
        return;
      }
      setShipping(prev => ({
        ...prev,
        email: prev.email || session.user.email || '',
        name: prev.name || (session.user.user_metadata?.full_name as string) || '',
      }));
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // ============ Exit-intent + inactividad (carrito abandonado) ============
  const [exitOpen, setExitOpen] = useState(false);
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (!shipping.email || !/.+@.+\..+/.test(shipping.email)) return;
    if (triggeredRef.current) return;

    let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, bump));

    const fire = (reason: string) => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      const sub = subtotal();
      supabase.functions.invoke('track-abandoned-cart', {
        body: {
          email: shipping.email,
          subtotal: sub,
          items: items.map((i) => ({ id: i.id, title: i.title, qty: i.quantity, price: i.price })),
          reason,
        },
      }).catch(() => {});
      setExitOpen(true);
    };

    const inactivityId = setInterval(() => {
      if (Date.now() - lastActivity > 180_000) fire('inactivity_3min');
    }, 15_000);

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 0) fire('mouse_leave_top');
    };
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      clearInterval(inactivityId);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [shipping.email, items, subtotal]);

  if (!authChecked || !isAuthed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const shippingCost = shippingMethod === 'express' ? 250 : shippingMethod === 'standard' ? 99 : 0;
  const sub = subtotal();
  const totalAfterDiscount = Math.max(0, sub - discountAmount);
  const total = totalAfterDiscount + shippingCost;

  if (items.length === 0 && !confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Tu carrito está vacío</h1>
          <Button onClick={() => navigate('/')}>Ir a la Tienda</Button>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (invalidVariants) {
      toast({ title: 'Variantes faltantes', description: 'Hay productos sin variante seleccionada.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setPaymentError('');

    try {
      // Paso 1: Crear orden (status: pending) vía Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
        body: {
          customer_name: shipping.name,
          customer_email: shipping.email,
          shipping_address: `${shipping.address}${shipping.address2 ? ', ' + shipping.address2 : ''}, ${shipping.city}, ${shipping.state} ${shipping.postalCode}, ${shipping.country}`,
          items: items.map(i => ({
            id: i.id,
            key: `${i.id}::${i.selectedVariant ?? ''}`,
            title: i.title,
            qty: i.quantity,
            price: i.price,
            variant: i.selectedVariant,
          })),
          shipping_method: shippingMethod,
          discount_code: discountCode || undefined,
          discount_amount: discountAmount || undefined,
          loyalty_points_used: loyaltyPointsApplied || 0,
          affiliate_code: localStorage.getItem('waxapp_affiliate_ref') || undefined,
          origin_domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
          payment_method: paymentMethod,
          tiered_discount_pct: tieredDiscountPct(),
          extras: extras,
        },
      });

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || 'Error al crear el pedido. Intenta de nuevo.');
      }

      const num: string = orderData.order_number;
      const orderId: string = orderData.order_id;
      const serverTotal: number = orderData.total;

      // Paso 2: Pago con Clip → Checkout redirect
      if (paymentMethod === 'card') {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { data: clipData, error: clipError } = await supabase.functions.invoke('clip-create-checkout', {
          body: {
            order_id: orderId,
            amount: serverTotal,
            currency: 'MXN',
            reference_number: num,
            description: `Pedido WAXAPP ${num}`,
            success_url: `${origin}/pago-exitoso?folio=${num}&order_id=${orderId}`,
            cancel_url: `${origin}/pago-cancelado?folio=${num}&order_id=${orderId}`,
          },
        });

        if (clipError || !clipData?.success || !clipData?.checkout_url) {
          throw new Error(clipData?.error || 'Error al iniciar el pago con Clip. Verifica la configuración.');
        }

        // Guardar contexto para cuando regrese el usuario
        sessionStorage.setItem('waxapp_pending_order', JSON.stringify({
          orderNumber: num,
          orderId,
          total: serverTotal,
          email: shipping.email,
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            price: i.price,
            selectedVariant: i.selectedVariant,
          })),
        }));

        clearCart();
        clearLoyaltyPoints();
        // Redirigir a Clip hosted checkout
        window.location.href = clipData.checkout_url;
        return;
      }

      // Métodos sin pasarela (OXXO / Transferencia) → confirmar pedido directamente
      clearCart();
      clearLoyaltyPoints();
      navigate('/orden-completada', {
        state: {
          orderNumber: num,
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            price: i.price,
            selectedVariant: i.selectedVariant,
          })),
          total: serverTotal,
          email: shipping.email,
          paymentMethod,
        },
        replace: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ocurrió un error al procesar tu pedido.';
      console.error('Order/Payment error:', e);
      setPaymentError(msg);
      toast({ title: 'Error de pago', description: msg, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" /> Volver a la tienda
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                step >= s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}>
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-px mx-2 ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground mb-6">Datos de Envío</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <Label className="text-foreground">Nombre completo *</Label>
                      <Input value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} className="bg-muted border-border" placeholder="Tu nombre" required />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <Label className="text-foreground">Email *</Label>
                      <Input type="email" value={shipping.email} onChange={e => setShipping({...shipping, email: e.target.value})} className="bg-muted border-border" placeholder="tu@email.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Teléfono *</Label>
                    <Input value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} className="bg-muted border-border" placeholder="+52 55 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Dirección *</Label>
                    <AddressAutocomplete
                      value={shipping.address}
                      onChange={v => setShipping(prev => ({ ...prev, address: v }))}
                      onSelect={fields => setShipping(prev => ({
                        ...prev,
                        address: fields.address,
                        city: fields.city || prev.city,
                        state: fields.state || prev.state,
                        postalCode: fields.postalCode || prev.postalCode,
                      }))}
                      className="bg-muted border-border"
                      placeholder="Calle y número exterior"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Número interior / Colonia / Referencias</Label>
                    <Input value={shipping.address2} onChange={e => setShipping({...shipping, address2: e.target.value})} className="bg-muted border-border" placeholder="Int. 4, Col. Roma Norte, entre calles..." />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">C.P. *</Label>
                      <div className="relative">
                        <Input
                          value={shipping.postalCode}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                            setShipping({...shipping, postalCode: v});
                            if (v.length === 5) scheduleCpLookup(v);
                          }}
                          onBlur={e => lookupPostalCode(e.target.value)}
                          className="bg-muted border-border"
                          placeholder="06700"
                          inputMode="numeric"
                          maxLength={5}
                          required
                        />
                        {cpLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Ciudad *</Label>
                      <Input value={shipping.city} onChange={e => setShipping({...shipping, city: e.target.value})} className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Estado *</Label>
                      <Input value={shipping.state} onChange={e => setShipping({...shipping, state: e.target.value})} className="bg-muted border-border" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!shipping.name || !shipping.email || !shipping.address || !shipping.postalCode || shipping.postalCode.length !== 5 || !shipping.city || !shipping.state} className="gap-2">
                      Continuar <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">Método de Envío</h2>
                  <RadioGroup value={shippingMethod} onValueChange={setShippingMethod} className="space-y-3">
                    {[
                      { value: 'standard', label: 'Estándar', desc: '5-7 días hábiles', price: '$99' },
                      { value: 'express', label: 'Express', desc: '2-3 días hábiles', price: '$250' },
                      { value: 'pickup', label: 'Recoger en tienda', desc: 'CDMX, disponible en 24h', price: 'Gratis' },
                    ].map((m) => (
                      <label key={m.value} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        shippingMethod === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
                      }`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={m.value} />
                          <div>
                            <p className="font-medium text-foreground">{m.label}</p>
                            <p className="text-sm text-muted-foreground">{m.desc}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-foreground">{m.price}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <div className="pt-4 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                    <Button onClick={() => setStep(3)} className="gap-2">
                      Continuar <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">Método de Pago</h2>

                  {invalidVariants && (
                    <div
                      role="alert"
                      className="rounded-lg border p-4 flex items-start gap-3"
                      style={{ borderColor: '#FFB300', backgroundColor: 'rgba(255,179,0,0.08)' }}
                    >
                      <span className="text-xl" style={{ color: '#FFB300' }}>⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#FFB300' }}>
                          Error: Hay productos en tu carrito sin una variante o sabor seleccionado.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Por favor, edita tu carrito antes de continuar.</p>
                        <button
                          type="button"
                          onClick={() => setCartOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline"
                          style={{ color: '#FFB300' }}
                        >
                          Editar carrito →
                        </button>
                      </div>
                    </div>
                  )}

                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    {[
                      { value: 'card', label: 'Tarjeta de Crédito/Débito', desc: 'Visa, Mastercard, Amex' },
                      { value: 'oxxo', label: 'OXXO Pay', desc: 'Paga en efectivo en cualquier OXXO' },
                      { value: 'transfer', label: 'Transferencia bancaria', desc: 'SPEI / CoDi' },
                    ].map((m) => (
                      <label key={m.value} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
                      }`}>
                        <RadioGroupItem value={m.value} />
                        <div>
                          <p className="font-medium text-foreground">{m.label}</p>
                          <p className="text-sm text-muted-foreground">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  {paymentMethod === 'card' && (
                    <div className="border-t border-border pt-6 space-y-3">
                      <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-4">
                        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">Pago seguro con Clip</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Serás redirigido al portal de pago seguro de Clip. Acepta Visa, Mastercard y Amex.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">payclip.com — cifrado SSL/TLS 256 bits</span>
                          </div>
                        </div>
                      </div>

                      {paymentError && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                          {paymentError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={invalidVariants || loading}
                      className="gap-2 bg-primary text-primary-foreground px-8"
                    >
                      {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                        : paymentMethod === 'card'
                          ? <><ExternalLink className="h-4 w-4" /> Pagar ${total.toLocaleString()} MXN con Clip</>
                          : `Confirmar pedido — $${total.toLocaleString()} MXN`
                      }
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-4">
              <h3 className="font-bold text-foreground">Resumen del Pedido</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => {
                  const k = `${item.id}::${item.selectedVariant ?? ''}`;
                  return (
                    <div key={k} className="flex justify-between text-sm">
                      <div>
                        <p className="text-foreground">{item.title} x{item.quantity}</p>
                        {item.selectedVariant && <p className="text-xs text-muted-foreground">{item.selectedVariant}</p>}
                      </div>
                      <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                <LoyaltyRedeemCard email={shipping.email} />
                <OrderSummary />
                {tieredDiscountPct() > 0 && (
                  <p className="text-xs text-green-500 font-medium">
                    🏷 Descuento por volumen {tieredDiscountPct()}% aplicado
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Envío seleccionado: <strong className="text-foreground">${shippingCost.toLocaleString()} MXN</strong> (paso 2). Total con envío: <strong className="text-foreground">${total.toLocaleString()} MXN</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ExitIntentModal
        open={exitOpen}
        onOpenChange={setExitOpen}
        onContinue={() => setExitOpen(false)}
      />
    </div>
  );
};

export default Checkout;

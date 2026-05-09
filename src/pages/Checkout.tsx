import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Package, Truck, CreditCard, MapPin, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';



const steps = [
  { id: 1, title: 'Datos de Envío', icon: MapPin },
  { id: 2, title: 'Método de Envío', icon: Truck },
  { id: 3, title: 'Pago', icon: CreditCard },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, discountCode, discountAmount, shippingCost: storeShipping, total: storeTotal } = useCartStore();
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

  // Card form state (for Clip SDK fields)
  const [cardData, setCardData] = useState({
    number: '', name: '', expMonth: '', expYear: '', cvv: '',
  });
  const [clipPublicKey, setClipPublicKey] = useState('');

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

  // Fetch Clip public key on mount
  useEffect(() => {
    supabase.functions.invoke('clip-config').then(({ data }) => {
      if (data?.public_key) setClipPublicKey(data.public_key);
    });
  }, []);

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
    setLoading(true);
    setPaymentError('');

    try {
      // Step 1: Create order (pending) via edge function
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
        },
      });

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || 'Failed to create order');
      }

      const num = orderData.order_number;
      const orderId = orderData.order_id;
      const serverTotal = orderData.total;
      const serverShippingCost = orderData.shipping_cost;

      // Step 2: Process payment with Clip (card only)
      if (paymentMethod === 'card') {
        // Tokenize card using Clip SDK
        if (typeof ClipSDK === 'undefined') {
          throw new Error('El SDK de pagos no se cargó. Recarga la página e intenta de nuevo.');
        }

        // Create a temporary form for Clip SDK
        const form = document.createElement('form');
        const fields = [
          { name: 'card_number', value: cardData.number.replace(/\s/g, '') },
          { name: 'card_name', value: cardData.name },
          { name: 'card_exp_month', value: cardData.expMonth },
          { name: 'card_exp_year', value: cardData.expYear },
          { name: 'card_cvv', value: cardData.cvv },
        ];
        fields.forEach(f => {
          const input = document.createElement('input');
          input.name = f.name;
          input.value = f.value;
          form.appendChild(input);
        });

        const clip = new ClipSDK(clipPublicKey);
        let cardToken: string;
        try {
          cardToken = await clip.cardToken(form);
        } catch (tokenErr: any) {
          throw new Error('Error al procesar la tarjeta. Verifica los datos e intenta de nuevo.');
        }

        // Process payment via our edge function
        const { data: payData, error: payError } = await supabase.functions.invoke('process-clip-payment', {
          body: {
            card_token: cardToken,
            order_id: orderId,
            amount: serverTotal,
            currency: 'MXN',
            customer_email: shipping.email,
            customer_name: shipping.name,
            customer_phone: shipping.phone,
            description: `Pedido WAXAPP ${num}`,
          },
        });

        if (payError || !payData?.success) {
          throw new Error(payData?.error || 'Error al procesar el pago.');
        }
      }

      setOrderNumber(num);

      // Send order confirmation email (fire-and-forget)
      const itemsHtml = items.map(i =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.title}${i.selectedVariant ? ` <span style="color:#9ca3af">(${i.selectedVariant})</span>` : ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${(i.price * i.quantity).toLocaleString()}</td>
        </tr>`
      ).join('');

      supabase.functions.invoke('send-email', {
        body: {
          to: shipping.email,
          subject: `Confirmación de Pedido ${num} - WAXAPP`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
            <div style="text-align:center;margin-bottom:24px">
              <h1 style="color:#8B5CF6;font-size:28px;margin:0">WAXAPP</h1>
              <p style="color:#6b7280;margin:4px 0 0">Confirmación de Pedido</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <h2 style="color:#1f2937;font-size:20px;margin:0 0 8px">¡Gracias por tu compra, ${shipping.name}!</h2>
            <p style="color:#4b5563;line-height:1.6">Tu pedido ha sido recibido y está siendo procesado.</p>
            <div style="background:#f3f4f6;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
              <p style="color:#6b7280;font-size:13px;margin:0">Número de pedido</p>
              <p style="color:#8B5CF6;font-size:28px;font-weight:bold;font-family:monospace;margin:4px 0 0">${num}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb">Producto</th>
                  <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb">Cant.</th>
                  <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb">Subtotal</th>
                </tr>
              </thead>
              <tbody style="font-size:14px;color:#1f2937">${itemsHtml}</tbody>
            </table>
            <div style="text-align:right;margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px">
              <span style="font-size:13px;color:#6b7280">Envío: $${serverShippingCost === 0 ? 'Gratis' : serverShippingCost.toLocaleString()}</span><br/>
              <span style="font-size:18px;font-weight:bold;color:#1f2937">Total: $${serverTotal.toLocaleString()} MXN</span>
            </div>
            <div style="margin:20px 0;padding:16px;background:#faf5ff;border-radius:8px;border-left:4px solid #8B5CF6">
              <p style="margin:0;font-size:13px;color:#6b7280"><strong>Dirección de envío:</strong></p>
              <p style="margin:4px 0 0;font-size:14px;color:#1f2937">${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.postalCode}</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="color:#9ca3af;font-size:12px;text-align:center">Este correo fue enviado automáticamente por WAXAPP. Si tienes dudas, contáctanos.</p>
          </div>`,
        },
      }).catch(() => {});

      clearCart();
      setConfirmed(true);
    } catch (e: any) {
      console.error('Order/Payment error:', e);
      setPaymentError(e.message || 'Ocurrió un error al procesar tu pedido.');
      toast({ title: 'Error de pago', description: e.message || 'Intenta de nuevo.', variant: 'destructive' });
    }

    setLoading(false);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md mx-auto p-8">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">¡Orden Confirmada!</h1>
            <p className="text-muted-foreground">Tu pedido ha sido procesado exitosamente.</p>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-sm text-muted-foreground">Número de orden</p>
              <p className="text-3xl font-mono font-bold text-primary mt-1">{orderNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">Recibirás un correo de confirmación a <strong className="text-foreground">{shipping.email}</strong></p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate('/')}>Seguir Comprando</Button>
              <Button onClick={() => navigate('/mi-cuenta')}>Ver Mis Pedidos</Button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

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
                    <Input value={shipping.address} onChange={e => setShipping({...shipping, address: e.target.value})} className="bg-muted border-border" placeholder="Calle y número exterior" />
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
                    <div className="space-y-4 border-t border-border pt-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>Pago seguro procesado por Clip</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Nombre en la tarjeta</Label>
                        <Input
                          value={cardData.name}
                          onChange={e => setCardData({ ...cardData, name: e.target.value })}
                          className="bg-muted border-border"
                          placeholder="Como aparece en la tarjeta"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Número de tarjeta</Label>
                        <Input
                          value={cardData.number}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                            setCardData({ ...cardData, number: v.replace(/(.{4})/g, '$1 ').trim() });
                          }}
                          className="bg-muted border-border font-mono"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Mes</Label>
                          <Input
                            value={cardData.expMonth}
                            onChange={e => setCardData({ ...cardData, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                            className="bg-muted border-border text-center"
                            placeholder="MM"
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Año</Label>
                          <Input
                            value={cardData.expYear}
                            onChange={e => setCardData({ ...cardData, expYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                            className="bg-muted border-border text-center"
                            placeholder="AA"
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">CVV</Label>
                          <Input
                            value={cardData.cvv}
                            onChange={e => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            className="bg-muted border-border text-center"
                            placeholder="123"
                            maxLength={4}
                            type="password"
                          />
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
                      disabled={loading || (paymentMethod === 'card' && (!cardData.number || !cardData.name || !cardData.expMonth || !cardData.expYear || !cardData.cvv))}
                      className="gap-2 bg-primary text-primary-foreground px-8"
                    >
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : `Pagar $${total.toLocaleString()} MXN`}
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
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <p className="text-foreground">{item.title} x{item.quantity}</p>
                      {item.selectedVariant && <p className="text-xs text-muted-foreground">{item.selectedVariant}</p>}
                    </div>
                    <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span>{shippingCost === 0 ? 'Gratis' : `$${shippingCost}`}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${total.toLocaleString()} MXN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;

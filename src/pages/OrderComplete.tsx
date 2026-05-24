import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, ArrowRight, Mail, Copy, CheckCircle2, Barcode, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

interface PassedItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  selectedVariant?: string;
}

const generateFolio = () => `WX-${Math.floor(1000 + Math.random() * 9000)}`;

const OrderComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as {
    orderNumber?: string;
    items?: PassedItem[];
    total?: number;
    email?: string;
    paymentMethod?: string;
  };

  const folio = useMemo(() => {
    if (state.orderNumber) return state.orderNumber;
    const url = new URLSearchParams(location.search);
    return url.get('folio') || generateFolio();
  }, [state.orderNumber, location.search]);

  const items = state.items || [];
  const total = state.total || items.reduce((s, i) => s + i.price * i.quantity, 0);
  const paymentMethod = state.paymentMethod || 'card';

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Pedido confirmado ${folio} | WAXAPP`;
  }, [folio]);

  useEffect(() => {
    if (paymentMethod === 'transfer') {
      setLoadingAccounts(true);
      supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .then(({ data, error }) => {
          if (!error && data) {
            setBankAccounts(data);
          }
          setLoadingAccounts(false);
        });
    }
  }, [paymentMethod]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const oxxoReference = useMemo(() => {
    if (paymentMethod !== 'oxxo') return '';
    const cleanNum = folio.replace(/[^A-Z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < cleanNum.length; i++) {
      hash = cleanNum.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absoluteHash = Math.abs(hash).toString().padEnd(10, '0').slice(0, 10);
    return `930012${absoluteHash}`;
  }, [folio, paymentMethod]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(0,230,118,0.12)',
              boxShadow: '0 0 40px rgba(0,230,118,0.45), inset 0 0 0 2px rgba(0,230,118,0.6)',
            }}
          >
            <Check className="h-14 w-14" style={{ color: '#00E676' }} strokeWidth={3} />
          </motion.div>

          <h1 className="mt-6 font-display text-3xl md:text-4xl font-bold text-foreground">
            ¡Pedido confirmado!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gracias por tu compra. Tu folio único es:
          </p>

          <div
            className="mt-4 inline-flex items-center gap-2 rounded-xl border px-6 py-3"
            style={{ borderColor: 'rgba(0,230,118,0.4)', backgroundColor: 'rgba(0,230,118,0.06)' }}
          >
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Folio</span>
            <span className="font-mono text-2xl font-bold" style={{ color: '#00E676' }}>
              {folio}
            </span>
          </div>
        </motion.div>

        {/* Payment Instructions Section */}
        {paymentMethod === 'oxxo' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                <Barcode className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Ficha de Pago en OXXO</h3>
                <p className="text-xs text-muted-foreground">Paga en efectivo en cualquier tienda OXXO</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-4">
              <div className="bg-card rounded-xl p-4 border border-border text-center space-y-2 relative overflow-hidden">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Referencia de Pago (OXXO Pay)</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-foreground select-all">
                  {oxxoReference}
                </p>
                <div className="flex justify-center gap-1.5 pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(oxxoReference, 'referencia')}
                    className="h-7 text-xs text-muted-foreground hover:text-primary gap-1"
                  >
                    {copiedText === 'referencia' ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Copiado</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copiar referencia</>
                    )}
                  </Button>
                </div>

                {/* Simulated Barcode */}
                <div className="mt-4 flex justify-center items-center gap-[2px] h-12 bg-white/5 px-4 py-2 rounded">
                  {[...Array(35)].map((_, i) => {
                    const width = (i % 3 === 0) ? 'w-1' : (i % 5 === 0) ? 'w-1.5' : 'w-[2px]';
                    const opacity = (i % 7 === 0) ? 'opacity-30' : 'opacity-80';
                    return (
                      <div key={i} className={`bg-foreground h-full ${width} ${opacity}`} />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Pasos para realizar el pago:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acude a tu tienda <strong className="text-foreground">OXXO</strong> más cercana.</li>
                  <li>Indica al cajero que deseas realizar un pago de servicio con <strong className="text-foreground">OXXO Pay</strong>.</li>
                  <li>Proporciona el número de referencia de 14 dígitos indicado arriba.</li>
                  <li>Realiza el pago correspondiente en efectivo. (OXXO cobrará una comisión de servicio en caja).</li>
                  <li>El pago se acreditará automáticamente. Te enviaremos un correo cuando esté listo.</li>
                </ol>
              </div>
            </div>
          </motion.section>
        )}

        {paymentMethod === 'transfer' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Transferencia Bancaria SPEI</h3>
                <p className="text-xs text-muted-foreground">Realiza tu transferencia electrónica desde tu banca móvil</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Por favor transfiere el monto exacto de <strong className="text-foreground">${total.toLocaleString()} MXN</strong> a cualquiera de las siguientes cuentas:
              </p>

              {loadingAccounts ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                  <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Cargando cuentas bancarias...</span>
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 text-center">
                  No hay cuentas bancarias activas disponibles en este momento. Por favor contáctanos para facilitarte los datos de pago.
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((acc: any) => (
                    <div key={acc.id} className="bg-card rounded-xl p-4 border border-border space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground text-sm">{acc.bank_name}</span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium uppercase">México</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Beneficiario</span>
                          <span className="font-semibold text-foreground">{acc.account_holder}</span>
                        </div>
                        {acc.clabe && (
                          <div className="flex justify-between items-center py-1 border-b border-border/40">
                            <span className="text-muted-foreground">CLABE (18 dígitos)</span>
                            <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                              <span>{acc.clabe}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => copyToClipboard(acc.clabe, `clabe-${acc.id}`)}
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                              >
                                {copiedText === `clabe-${acc.id}` ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        {acc.account_number && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-muted-foreground">Número de Cuenta</span>
                            <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                              <span>{acc.account_number}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => copyToClipboard(acc.account_number, `acc-${acc.id}`)}
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                              >
                                {copiedText === `acc-${acc.id}` ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      {acc.notes && <p className="text-[11px] text-muted-foreground italic mt-1 border-t border-border/30 pt-1.5">Nota: {acc.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Pasos para realizar tu pago:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Ingresa a la banca móvil o portal de tu banco.</li>
                  <li>Registra los datos indicados arriba (CLABE o número de cuenta).</li>
                  <li>Transfiere el monto exacto: <strong className="text-foreground">${total.toLocaleString()} MXN</strong>.</li>
                  <li>En el concepto/referencia de pago, escribe tu folio: <strong className="text-foreground">{folio}</strong>.</li>
                  <li>Responde al correo de confirmación de tu pedido adjuntando tu comprobante de pago.</li>
                </ol>
              </div>
            </div>
          </motion.section>
        )}

        {items.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-xl border border-border bg-card p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Package className="h-4 w-4" /> Resumen de tu pedido
            </h2>
            <ul className="divide-y divide-border">
              {items.map((it) => {
                const key = `${it.id}::${it.selectedVariant ?? ''}`;
                return (
                  <li key={key} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{it.title}</p>
                      {it.selectedVariant && (
                        <p className="text-xs text-muted-foreground">{it.selectedVariant}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Cantidad: {it.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      ${(it.price * it.quantity).toLocaleString()} MXN
                    </span>
                  </li>
                );
              })}
            </ul>
            {total > 0 && (
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold text-foreground">
                <span>Total</span>
                <span>${total.toLocaleString()} MXN</span>
              </div>
            )}
          </motion.section>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-8 rounded-xl border border-border bg-card/60 p-5 text-center"
        >
          <Mail className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm text-foreground">
            {paymentMethod === 'card' 
              ? 'Tu orden está siendo preparada. Recibirás tu guía de envío por correo una vez acreditado tu pago con Clip.'
              : 'Hemos guardado tu pedido. Te enviaremos tu guía de envío por correo en cuanto confirmemos tu pago manual.'}
          </p>
          {state.email && (
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmación e instrucciones enviadas a <strong className="text-foreground">{state.email}</strong>
            </p>
          )}
        </motion.div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/tienda')} className="gap-2">
            Volver a la tienda <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/mi-cuenta">
            <Button className="gap-2">Ver mi cuenta</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderComplete;

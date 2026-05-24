import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const folio = searchParams.get('folio') || '';
  const orderId = searchParams.get('order_id') || '';

  const [status, setStatus] = useState<'loading' | 'confirmed' | 'pending'>('loading');
  const [orderData, setOrderData] = useState<{
    orderNumber: string;
    total: number;
    email: string;
    items: { id: string; title: string; quantity: number; price: number; selectedVariant?: string }[];
  } | null>(null);

  useEffect(() => {
    document.title = `Pago exitoso ${folio} | WAXAPP`;

    // Recuperar datos del contexto de sesión guardados antes del redirect
    try {
      const raw = sessionStorage.getItem('waxapp_pending_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        setOrderData(parsed);
        sessionStorage.removeItem('waxapp_pending_order');
      }
    } catch {
      // ignore
    }

    // Verificar estado real de la orden en Supabase (el webhook de Clip la actualiza)
    const checkOrder = async () => {
      if (!orderId) {
        setStatus('pending');
        return;
      }
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();

        if (order?.status === 'paid' || order?.status === 'confirmed') {
          setStatus('confirmed');
        } else {
          // Puede ser que el webhook aún no llegó — mostramos pending pero optimista
          setStatus('pending');
        }
      } catch {
        setStatus('pending');
      }
    };

    checkOrder();
  }, [folio, orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {status === 'loading' ? (
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'rgba(0,230,118,0.12)',
                  boxShadow: '0 0 40px rgba(0,230,118,0.45), inset 0 0 0 2px rgba(0,230,118,0.6)',
                }}
              >
                <Check className="h-14 w-14" style={{ color: '#00E676' }} strokeWidth={3} />
              </motion.div>

              <h1 className="mt-6 font-display text-3xl md:text-4xl font-bold text-foreground">
                ¡Pago {status === 'confirmed' ? 'confirmado' : 'recibido'}!
              </h1>
              <p className="mt-2 text-muted-foreground">
                {status === 'confirmed'
                  ? 'Tu transacción fue procesada exitosamente.'
                  : 'Tu pago está siendo verificado. Recibirás confirmación por correo.'}
              </p>

              {folio && (
                <div
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border px-6 py-3"
                  style={{ borderColor: 'rgba(0,230,118,0.4)', backgroundColor: 'rgba(0,230,118,0.06)' }}
                >
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Folio</span>
                  <span className="font-mono text-2xl font-bold" style={{ color: '#00E676' }}>
                    {folio}
                  </span>
                </div>
              )}
            </>
          )}
        </motion.div>

        {orderData && orderData.items.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 rounded-xl border border-border bg-card p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Package className="h-4 w-4" /> Resumen de tu pedido
            </h2>
            <ul className="divide-y divide-border">
              {orderData.items.map((it) => (
                <li key={`${it.id}::${it.selectedVariant ?? ''}`} className="flex items-center justify-between gap-3 py-3">
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
              ))}
            </ul>
            {orderData.total > 0 && (
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold text-foreground">
                <span>Total</span>
                <span>${orderData.total.toLocaleString()} MXN</span>
              </div>
            )}
          </motion.section>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button variant="outline" onClick={() => navigate('/tienda')} className="gap-2">
            Seguir comprando <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/mi-cuenta">
            <Button className="gap-2">Ver mis pedidos</Button>
          </Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;

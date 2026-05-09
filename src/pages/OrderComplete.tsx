import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
  };

  const folio = useMemo(() => {
    if (state.orderNumber) return state.orderNumber;
    const url = new URLSearchParams(location.search);
    return url.get('folio') || generateFolio();
  }, [state.orderNumber, location.search]);

  const items = state.items || [];
  const total = state.total || items.reduce((s, i) => s + i.price * i.quantity, 0);

  useEffect(() => {
    document.title = `Pedido confirmado ${folio} | WAXAPP`;
  }, [folio]);

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

        {items.length > 0 && (
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
            Tu orden está siendo preparada. Recibirás tu guía de envío por correo.
          </p>
          {state.email && (
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmación enviada a <strong className="text-foreground">{state.email}</strong>
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

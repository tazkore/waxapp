import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const folio = searchParams.get('folio') || '';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 0 0 2px rgba(239,68,68,0.5)',
            }}
          >
            <XCircle className="h-14 w-14 text-destructive" strokeWidth={1.5} />
          </motion.div>

          <h1 className="mt-6 text-3xl font-bold text-foreground">Pago no completado</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Cancelaste el proceso de pago o hubo un error al procesar tu transacción.
            <br />
            Tu pedido <strong className="text-foreground">{folio ? `#${folio}` : 'pendiente'}</strong> sigue guardado.
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-foreground">¿Qué puedo hacer?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Regresar al checkout e intentar el pago de nuevo</li>
              <li>Verificar que tu tarjeta tenga fondos suficientes</li>
              <li>Usar otro método de pago (OXXO o Transferencia)</li>
              <li>Contactar a tu banco si el problema persiste</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver atrás
            </Button>
            <Button onClick={() => navigate('/checkout')} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reintentar pago
            </Button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCancelled;

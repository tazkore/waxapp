import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, ShoppingBag, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'wax_cart_onboarding_seen';

const STEPS = [
  {
    icon: ShoppingBag,
    title: 'Agrega productos',
    body: 'Explora la tienda y haz clic en "Agregar al carrito" desde cualquier producto. Verás un contador en el ícono superior.',
  },
  {
    icon: Trash2,
    title: 'Quita lo que no quieras',
    body: 'En el panel del carrito puedes eliminar artículos con el ícono de la papelera o ajustar cantidades.',
  },
  {
    icon: CreditCard,
    title: 'Finaliza tu compra',
    body: 'Cuando estés listo, haz clic en “Proceder al Pago Seguro”. Te llevamos a un checkout de 3 pasos: dirección, envío y pago.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const CartOnboarding = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  };

  const current = STEPS[step];
  const Icon = current?.icon;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
          onClick={finish}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl neon-glow"
          >
            <button
              onClick={finish}
              aria-label="Cerrar tour"
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/15">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Paso {step + 1} de {STEPS.length}
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              {current.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {current.body}
            </p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i === step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Siguiente
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={finish}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:neon-glow"
                  >
                    ¡Listo!
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const hasSeenCartOnboarding = () =>
  typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';

export default CartOnboarding;

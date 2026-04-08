import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface AgeGateProps {
  onAccept: () => void;
}

const AgeGate = ({ onAccept }: AgeGateProps) => {
  const handleReject = () => {
    window.location.href = 'https://google.com';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center"
        >
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
            Verificación de Edad
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Debes ser mayor de 18 años para acceder. WAXAPP opera bajo estrictas normativas legales.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onAccept}
              className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:neon-glow"
            >
              Tengo +18 (Entrar)
            </button>
            <button
              onClick={handleReject}
              className="flex-1 rounded-lg border border-border bg-muted px-6 py-3 font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Soy menor (Salir)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgeGate;

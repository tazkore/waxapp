import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'waxapp_age_verified';
const PROTECTED_PATTERNS = [/^\/$/, /^\/tienda/, /^\/shop/, /^\/checkout/, /^\/orden-completada/, /^\/producto/, /^\/blog/, /^\/cbd/, /^\/edibles/, /^\/laboratorios/, /^\/marcas/, /^\/neshika/, /^\/s\//];
const EXEMPT_PATTERNS = [/^\/admin/, /^\/cliente/, /^\/mi-cuenta/, /^\/reset-password/, /^\/portal-vendedores/];

const AgeGate = () => {
  const { pathname } = useLocation();
  const [verified, setVerified] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  // Listen for cross-tab changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === 'true') setVerified(true);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isExempt = EXEMPT_PATTERNS.some((r) => r.test(pathname));
  const isProtected = PROTECTED_PATTERNS.some((r) => r.test(pathname));
  if (verified || isExempt || !isProtected) return null;

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVerified(true);
  };
  const reject = () => { window.location.href = 'https://google.com'; };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agegate-title"
        aria-describedby="agegate-desc"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center"
        >
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 id="agegate-title" className="mb-2 font-display text-2xl font-bold text-foreground">
            Verificación de Edad
          </h2>
          <p id="agegate-desc" className="mb-6 text-sm text-muted-foreground">
            Debes ser mayor de 18 años para acceder. WAXAPP opera bajo estrictas normativas legales.
          </p>
          <div className="flex gap-3">
            <button
              onClick={accept}
              autoFocus
              className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:neon-glow"
            >
              Tengo +18 (Entrar)
            </button>
            <button
              onClick={reject}
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

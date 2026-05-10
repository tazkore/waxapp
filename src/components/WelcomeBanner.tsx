import { motion } from 'framer-motion';
import { Gift, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/store/cartStore';

const WelcomeBanner = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('welcome_banner_dismissed') === '1'
  );
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('welcome_banner_dismissed', '1');
    setDismissed(true);
  };

  const handleClick = async () => {
    if (loading) return;
    if (!authed) {
      navigate('/cliente?claim=welcome');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('welcome-coupon');
      if (error || !data?.code) {
        toast.error('No pudimos obtener tu cupón', {
          description: 'Intenta más tarde o contacta soporte.',
        });
        return;
      }
      const ok = await applyDiscount(data.code);
      if (ok) {
        toast.success(`Cupón ${data.code} aplicado`, {
          description: `${data.value}% de descuento de bienvenida.`,
        });
        localStorage.setItem('welcome_banner_dismissed', '1');
        setDismissed(true);
        setCartOpen(true);
      } else {
        toast.info('Agrega productos al carrito', {
          description: `Tu cupón ${data.code} se aplicará al llegar al monto mínimo.`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium hover:brightness-110 transition relative disabled:opacity-70"
      aria-label="Aplicar 15% de descuento de bienvenida"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Sparkles className="h-4 w-4 hidden sm:block" />
          <Gift className="h-4 w-4" />
        </>
      )}
      <span>
        <strong>15% OFF de bienvenida</strong> ·{' '}
        {authed ? 'Aplica tu cupón al instante' : 'Regístrate y recibe tu cupón'}
      </span>
      <span className="hidden sm:inline underline ml-1">
        {authed ? 'Aplicar →' : 'Reclamar →'}
      </span>
      <span
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-foreground/70 hover:text-primary-foreground text-lg leading-none cursor-pointer"
        aria-label="Cerrar"
      >
        ×
      </span>
    </motion.button>
  );
};

export default WelcomeBanner;

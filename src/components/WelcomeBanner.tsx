import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const WelcomeBanner = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('welcome_banner_dismissed') === '1'
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  if (authed || dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('welcome_banner_dismissed', '1');
    setDismissed(true);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/cliente')}
      className="w-full bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium hover:brightness-110 transition relative"
      aria-label="Regístrate y obtén 15% de descuento"
    >
      <Sparkles className="h-4 w-4 hidden sm:block" />
      <Gift className="h-4 w-4" />
      <span>
        <strong>15% OFF de bienvenida</strong> · Regístrate y recibe tu cupón al instante
      </span>
      <span className="hidden sm:inline underline ml-1">Reclamar →</span>
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

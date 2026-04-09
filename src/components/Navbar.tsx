import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, User, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const navLinks = [
  { label: 'Tienda', href: '#tienda' },
  { label: 'Tecnología Nano', href: '#tech' },
  { label: 'Legalidad', href: '#legal' },
  { label: 'FAQ', href: '#faq' },
];

const Navbar = () => {
  const toggleCart = useCartStore((s) => s.toggleCart);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = totalItems();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="#" className="font-display text-xl font-bold tracking-wider text-foreground">
          WAXAPP<span className="text-primary">.</span>
        </a>

        <div className="hidden gap-8 md:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleCart} className="relative rounded-lg p-2 text-foreground transition-colors hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-foreground hover:bg-muted md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

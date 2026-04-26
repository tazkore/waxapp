import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, User, Shield, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import GlobalSearch from './GlobalSearch';

const FALLBACK_LINKS = [
  { label: 'Tienda', href: '/#tienda' },
  { label: 'CBD', href: '/cbd' },
  { label: 'Edibles', href: '/edibles' },
  { label: 'Marcas', href: '/marcas' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/#faq' },
];

const Navbar = () => {
  const toggleCart = useCartStore((s) => s.toggleCart);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = totalItems();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<{ label: string; href: string; openInNewTab?: boolean }[]>(FALLBACK_LINKS);

  // Load editable navbar from DB (Tema > Menús), fallback to hardcoded
  useEffect(() => {
    const loadMenu = async () => {
      const { data: menu } = await supabase
        .from('nav_menus')
        .select('id')
        .eq('slug', 'main-navbar')
        .eq('is_active', true)
        .maybeSingle();
      if (!menu) return;
      const { data: items } = await supabase
        .from('nav_menu_items')
        .select('label, url, open_in_new_tab, display_order')
        .eq('menu_id', menu.id)
        .eq('is_active', true)
        .is('parent_id', null)
        .order('display_order');
      if (items && items.length > 0) {
        setNavLinks(items.map((i: any) => ({ label: i.label, href: i.url, openInNewTab: i.open_in_new_tab })));
      }
    };
    loadMenu();

    const channel = supabase
      .channel('nav-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nav_menu_items' }, loadMenu)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Cmd/Ctrl + K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="#" className="font-display text-xl font-bold tracking-wider text-foreground">
          WAXAPP<span className="text-primary">.</span>
        </a>

        <div className="hidden gap-8 md:flex">
          {navLinks.map((l, idx) => (
            <a
              key={`${l.href}-${idx}`}
              href={l.href}
              target={l.openInNewTab ? '_blank' : undefined}
              rel={l.openInNewTab ? 'noreferrer' : undefined}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
            title="Buscar (Ctrl+K)"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <button onClick={toggleCart} className="relative rounded-lg p-2 text-foreground transition-colors hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>

          {session ? (
            <a href="/mi-cuenta" className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted" title="Mi Cuenta">
              <User className="h-5 w-5" />
            </a>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <a href="/cliente" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <User className="h-4 w-4" /> Clientes
              </a>
              <a href="/admin/login" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Shield className="h-4 w-4" /> Admin
              </a>
            </div>
          )}

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
              {!session && (
                <>
                  <a href="/cliente" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <User className="h-4 w-4" /> Iniciar Sesión
                  </a>
                  <a href="/admin/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Shield className="h-4 w-4" /> Admin
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
};

export default Navbar;

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, ShoppingBag, HelpCircle, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import OrderSummary from './OrderSummary';
import CartOnboarding, { hasSeenCartOnboarding } from './CartOnboarding';

const MAX_QTY = 99;

const CartDrawer = () => {
  const { items, isOpen, setCartOpen, removeItem, updateQuantity, addItem, totalItems } = useCartStore();
  const navigate = useNavigate();
  const count = totalItems();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isOpen && !hasSeenCartOnboarding()) {
      const t = setTimeout(() => setShowOnboarding(true), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleRemove = (item: typeof items[number], key: string) => {
    const snapshot = { ...item };
    removeItem(key);
    toast.success('Producto eliminado', {
      description: item.title,
      action: {
        label: 'Deshacer',
        onClick: () => addItem(snapshot, snapshot.quantity, snapshot.selectedVariant),
      },
    });
  };

  const handleQty = (key: string, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1 || next > MAX_QTY) return;
    updateQuantity(key, next);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-foreground">Tu Carrito</h2>
                  {count > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      {count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                    title="¿Cómo funciona el carrito?"
                    aria-label="Ver tour"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Cerrar carrito"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 pt-20 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12" />
                    <p>Tu carrito está vacío</p>
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Cómo agregar productos?
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {items.map((item) => {
                        const key = `${item.id}::${item.selectedVariant ?? ''}`;
                        const atMax = item.quantity >= MAX_QTY;
                        const atMin = item.quantity <= 1;
                        return (
                          <motion.li
                            key={key}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 40, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-muted p-3"
                          >
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs text-muted-foreground">WAX</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                              {item.selectedVariant && (
                                <p className="text-xs text-muted-foreground">{item.selectedVariant}</p>
                              )}
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                ${item.price.toLocaleString()} c/u
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => handleQty(key, item.quantity, -1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Disminuir"
                                  disabled={atMin}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <motion.span
                                  key={item.quantity}
                                  initial={{ scale: 0.8, opacity: 0.6 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.15 }}
                                  className="min-w-[1.5rem] text-center text-sm font-medium text-foreground"
                                >
                                  {item.quantity}
                                </motion.span>
                                <button
                                  onClick={() => handleQty(key, item.quantity, 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Aumentar"
                                  disabled={atMax}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <span className="ml-auto text-sm font-semibold text-foreground">
                                  ${(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemove(item, key)}
                              className="self-start text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-border p-4">
                  <OrderSummary />
                  <button
                    onClick={() => { setCartOpen(false); navigate('/checkout'); }}
                    className="mt-4 w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:neon-glow hover:brightness-110"
                  >
                    Proceder al Pago Seguro
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CartOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
};

export default CartDrawer;

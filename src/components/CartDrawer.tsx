import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ShoppingBag, HelpCircle, Minus, Plus, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import OrderSummary from './OrderSummary';
import CartOnboarding, { hasSeenCartOnboarding } from './CartOnboarding';
import FreeShippingBar from './cart/FreeShippingBar';
import UpsellStrip from './cart/UpsellStrip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const MAX_QTY = 99;

const CartDrawer = () => {
  const {
    items,
    isOpen,
    setCartOpen,
    removeItem,
    updateQuantity,
    addItem,
    totalItems,
    subtotal,
    discountAmount,
    loyaltyPointsApplied,
  } = useCartStore();
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

  const sub = subtotal();
  const subAfter = Math.max(0, sub - (discountAmount || 0) - (loyaltyPointsApplied || 0));

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-md flex flex-col p-0 bg-card border-l border-border"
        >
          <SheetHeader className="border-b border-border p-4 text-left space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetTitle className="font-display text-lg font-bold text-foreground">
                  Tu Carrito
                </SheetTitle>
                {count > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {count}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowOnboarding(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                title="¿Cómo funciona el carrito?"
                aria-label="Ver tour"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          {items.length > 0 && <FreeShippingBar subtotalAfterDiscounts={subAfter} />}

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Tu carrito está esperando
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Descubre nuestros productos premium.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setCartOpen(false);
                    navigate('/tienda');
                  }}
                  className="bg-primary text-primary-foreground hover:brightness-110"
                >
                  Explorar Productos
                </Button>
              </div>
            ) : (
              <ul className="space-y-3 p-4">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const key = `${item.id}::${item.selectedVariant ?? ''}`;
                    const atMax = item.quantity >= MAX_QTY;
                    const atMin = item.quantity <= 1;
                    const needsVariant = (item.variants?.length ?? 0) > 0 && !item.selectedVariant;
                    return (
                      <motion.li
                        key={key}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={`flex items-center gap-3 overflow-hidden rounded-lg border bg-muted p-3 ${needsVariant ? 'border-amber-500/70 bg-amber-500/5' : 'border-border'}`}
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
                          {item.selectedVariant ? (
                            <p className="text-xs text-muted-foreground">{item.selectedVariant}</p>
                          ) : needsVariant ? (
                            <p className="text-xs font-medium text-secondary">⚠️ Selecciona variante</p>
                          ) : null}
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

            {items.length > 0 && <UpsellStrip />}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border bg-card p-4">
              <OrderSummary />
              <Button
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="mt-3 w-full bg-primary py-6 text-base font-semibold text-primary-foreground transition-all hover:neon-glow hover:brightness-110"
              >
                Proceder al Pago Seguro →
              </Button>
              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Checkout 100% encriptado</span>
                <span className="ml-1 flex items-center gap-1 font-mono">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px]">VISA</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px]">MC</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px]">AMEX</span>
                </span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CartOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
};

export default CartDrawer;

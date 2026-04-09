import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

const CartDrawer = () => {
  const { items, isOpen, setCartOpen, removeItem, subtotal } = useCartStore();
  const navigate = useNavigate();
  const total = subtotal();

  return (
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
              <h2 className="font-display text-lg font-bold text-foreground">Tu Carrito</h2>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 pt-20 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 rounded-lg border border-border bg-muted p-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent">
                        <span className="text-xs text-muted-foreground">WAX</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × ${item.price.toLocaleString()}
                        </p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border p-4">
                <div className="mb-4 flex justify-between text-lg font-bold text-foreground">
                  <span>Subtotal</span>
                  <span>${total.toLocaleString()} MXN</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); navigate('/checkout'); }}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:neon-glow hover:brightness-110"
                >
                  Proceder al Pago Seguro
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;

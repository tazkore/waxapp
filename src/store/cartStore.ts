import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { mergeCarts } from '@/lib/mergeCarts';

export interface ProductVariant {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  badge?: string;
  image?: string;
  description?: string;
  variants?: ProductVariant[];
  benefits?: string;
  usage?: string;
  legal?: string;
}

interface CartItem extends Product {
  quantity: number;
  selectedVariant?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  totalItems: () => number;
  subtotal: () => number;
  syncWithServer: (userId: string) => Promise<void>;
  pushToServer: (userId: string) => Promise<void>;
}

let currentUserId: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleServerPush = (getItems: () => CartItem[]) => {
  if (!currentUserId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!currentUserId) return;
    try {
      await supabase
        .from('carts')
        .upsert({ user_id: currentUserId, items: getItems() as any }, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Cart sync failed:', e);
    }
  }, 600);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const sync = () => scheduleServerPush(() => get().items);
      return {
        items: [],
        isOpen: false,
        addItem: (product, quantity = 1, variant) => {
          set((state) => {
            const existing = state.items.find((i) =>
              variant ? i.id === product.id && i.selectedVariant === variant : i.id === product.id
            );
            if (existing) {
              return {
                items: state.items.map((i) =>
                  (variant ? i.id === product.id && i.selectedVariant === variant : i.id === product.id)
                    ? { ...i, quantity: i.quantity + quantity }
                    : i
                ),
              };
            }
            const variantPrice = product.variants?.find((v) => v.name === variant)?.price ?? product.price;
            return { items: [...state.items, { ...product, price: variantPrice, quantity, selectedVariant: variant }] };
          });
          sync();
        },
        removeItem: (id) => {
          // `id` may be a plain product id OR a composite "id::variant" key.
          set((state) => ({
            items: state.items.filter((i) => {
              const composite = `${i.id}::${i.selectedVariant ?? ''}`;
              return composite !== id && i.id !== id;
            }),
          }));
          sync();
        },
        updateQuantity: (id, quantity) => {
          set((state) => ({
            items:
              quantity <= 0
                ? state.items.filter((i) => {
                    const composite = `${i.id}::${i.selectedVariant ?? ''}`;
                    return composite !== id && i.id !== id;
                  })
                : state.items.map((i) => {
                    const composite = `${i.id}::${i.selectedVariant ?? ''}`;
                    return composite === id || i.id === id ? { ...i, quantity } : i;
                  }),
          }));
          sync();
        },
        clearCart: () => {
          set({ items: [] });
          sync();
        },
        toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
        setCartOpen: (open) => set({ isOpen: open }),
        totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
        subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        syncWithServer: async (userId: string) => {
          currentUserId = userId;
          try {
            const { data, error } = await supabase
              .from('carts')
              .select('items')
              .eq('user_id', userId)
              .maybeSingle();
            if (error) throw error;

            const localItems = get().items;
            const serverItems = (data?.items as unknown as CartItem[]) ?? [];
            const merged = mergeCarts(localItems as any, serverItems as any) as unknown as CartItem[];
            set({ items: merged });

            await supabase
              .from('carts')
              .upsert({ user_id: userId, items: merged as any }, { onConflict: 'user_id' });
          } catch (e) {
            console.error('Cart reconcile failed:', e);
          }
        },
        pushToServer: async (userId: string) => {
          currentUserId = userId;
          await supabase
            .from('carts')
            .upsert({ user_id: userId, items: get().items as any }, { onConflict: 'user_id' });
        },
      };
    },
    {
      name: 'wax-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Hook into auth: reconcile on sign-in, stop syncing on sign-out
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      currentUserId = session.user.id;
      useCartStore.getState().syncWithServer(session.user.id);
    }
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      useCartStore.getState().syncWithServer(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      currentUserId = null;
    }
  });
}

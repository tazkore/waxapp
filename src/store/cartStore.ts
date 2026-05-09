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
  brand?: string;
}

export const FREE_SHIPPING_THRESHOLD = 1500;

interface CartItem extends Product {
  quantity: number;
  selectedVariant?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  discountCode: string | null;
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountError: string | null;
  discountLoading: boolean;
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  totalItems: () => number;
  subtotal: () => number;
  shippingCost: () => number;
  total: () => number;
  applyDiscount: (code: string) => Promise<boolean>;
  clearDiscount: () => void;
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
          const safeQty = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
          set((state) => ({
            items:
              safeQty <= 0
                ? state.items.filter((i) => {
                    const composite = `${i.id}::${i.selectedVariant ?? ''}`;
                    return composite !== id && i.id !== id;
                  })
                : state.items.map((i) => {
                    const composite = `${i.id}::${i.selectedVariant ?? ''}`;
                    const clamped = Math.min(99, Math.max(1, safeQty));
                    return composite === id || i.id === id ? { ...i, quantity: clamped } : i;
                  }),
          }));
          sync();
        },
        clearCart: () => {
          set({ items: [], discountCode: null, discountAmount: 0, discountType: null, discountError: null });
          sync();
        },
        toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
        setCartOpen: (open) => set({ isOpen: open }),
        totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
        subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        shippingCost: () => {
          const sub = get().items.reduce((s, i) => s + i.price * i.quantity, 0);
          const disc = get().discountAmount || 0;
          if (sub === 0) return 0;
          return sub - disc >= FREE_SHIPPING_THRESHOLD ? 0 : 99;
        },
        total: () => {
          const sub = get().items.reduce((s, i) => s + i.price * i.quantity, 0);
          const disc = get().discountAmount || 0;
          const ship = sub === 0 ? 0 : (sub - disc >= FREE_SHIPPING_THRESHOLD ? 0 : 99);
          return Math.max(0, sub - disc) + ship;
        },
        discountCode: null,
        discountAmount: 0,
        discountType: null,
        discountError: null,
        discountLoading: false,
        applyDiscount: async (code: string) => {
          const trimmed = (code || '').trim().toUpperCase();
          if (!trimmed) return false;
          set({ discountLoading: true, discountError: null });
          try {
            const sub = get().items.reduce((s, i) => s + i.price * i.quantity, 0);
            const { data, error } = await supabase.functions.invoke('validate-discount', {
              body: { code: trimmed, purchase_total: sub },
            });
            if (error) throw error;
            if (!data?.valid) {
              set({ discountLoading: false, discountError: data?.error || 'Código inválido', discountCode: null, discountAmount: 0, discountType: null });
              return false;
            }
            set({
              discountLoading: false,
              discountError: null,
              discountCode: trimmed,
              discountAmount: data.discount_amount,
              discountType: data.type,
            });
            return true;
          } catch (e: any) {
            set({ discountLoading: false, discountError: e?.message || 'Error al validar el código' });
            return false;
          }
        },
        clearDiscount: () => set({ discountCode: null, discountAmount: 0, discountType: null, discountError: null }),
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
      version: 1,
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

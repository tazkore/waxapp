import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, quantity = 1, variant) =>
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
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id || (i.selectedVariant && `${i.id}-${i.selectedVariant}` !== id)),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setCartOpen: (open) => set({ isOpen: open }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'wax-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

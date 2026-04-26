/**
 * Cart reconciliation strategy
 * --------------------------------
 * When a user signs in we may have items in two places:
 *   - localItems  → carrito anónimo guardado en localStorage
 *   - serverItems → carrito previamente persistido en la base de datos
 *
 * Strategy:
 *   1. Match items by composite key `id + selectedVariant` (variant ?? '').
 *   2. If the same item exists in both, **sum quantities** (the user clearly
 *      wants both amounts) and clamp to a sane maximum (default 99).
 *   3. Items unique to either side are kept as-is.
 *   4. Local item metadata (price, image, title) wins over server metadata,
 *      because product info may have changed since the server snapshot.
 *   5. Items with quantity ≤ 0 are filtered out.
 *
 * The function is **pure** so it can be unit-tested without Supabase.
 */

export interface MergeableCartItem {
  id: string;
  selectedVariant?: string;
  quantity: number;
  price: number;
  title?: string;
  category?: string;
  image?: string;
  [key: string]: unknown;
}

export const cartItemKey = (i: Pick<MergeableCartItem, 'id' | 'selectedVariant'>) =>
  `${i.id}::${i.selectedVariant ?? ''}`;

export function mergeCarts<T extends MergeableCartItem>(
  localItems: T[],
  serverItems: T[],
  opts: { maxQuantityPerItem?: number } = {}
): T[] {
  const max = opts.maxQuantityPerItem ?? 99;
  const map = new Map<string, T>();

  // Seed with server items first
  for (const it of serverItems) {
    if (!it || !it.id || it.quantity <= 0) continue;
    map.set(cartItemKey(it), { ...it });
  }

  // Overlay local items: sum quantities, prefer local metadata
  for (const it of localItems) {
    if (!it || !it.id || it.quantity <= 0) continue;
    const k = cartItemKey(it);
    const prev = map.get(k);
    if (prev) {
      map.set(k, { ...it, quantity: Math.min(max, prev.quantity + it.quantity) });
    } else {
      map.set(k, { ...it, quantity: Math.min(max, it.quantity) });
    }
  }

  return Array.from(map.values());
}

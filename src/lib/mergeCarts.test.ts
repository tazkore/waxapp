import { describe, it, expect } from 'vitest';
import { mergeCarts, cartItemKey, type MergeableCartItem } from '@/lib/mergeCarts';

const item = (over: Partial<MergeableCartItem>): MergeableCartItem => ({
  id: 'p1',
  quantity: 1,
  price: 100,
  ...over,
});

describe('cartItemKey', () => {
  it('treats missing variant as empty string', () => {
    expect(cartItemKey({ id: 'a' })).toBe('a::');
  });
  it('includes variant when present', () => {
    expect(cartItemKey({ id: 'a', selectedVariant: '0.5g' })).toBe('a::0.5g');
  });
});

describe('mergeCarts', () => {
  it('returns server items when local is empty', () => {
    const server = [item({ id: 'p1', quantity: 2 })];
    expect(mergeCarts([], server)).toEqual([item({ id: 'p1', quantity: 2 })]);
  });

  it('returns local items when server is empty', () => {
    const local = [item({ id: 'p1', quantity: 3 })];
    expect(mergeCarts(local, [])).toEqual([item({ id: 'p1', quantity: 3 })]);
  });

  it('sums quantities when same id+variant exists in both', () => {
    const local = [item({ id: 'p1', selectedVariant: '0.5g', quantity: 2 })];
    const server = [item({ id: 'p1', selectedVariant: '0.5g', quantity: 3 })];
    const merged = mergeCarts(local, server);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
  });

  it('treats different variants of same product as separate lines', () => {
    const local = [item({ id: 'p1', selectedVariant: '0.5g', quantity: 1 })];
    const server = [item({ id: 'p1', selectedVariant: '1g', quantity: 2 })];
    const merged = mergeCarts(local, server);
    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.selectedVariant === '0.5g')?.quantity).toBe(1);
    expect(merged.find((i) => i.selectedVariant === '1g')?.quantity).toBe(2);
  });

  it('prefers local metadata (price/title) over server metadata', () => {
    const local = [item({ id: 'p1', price: 150, title: 'NEW' })];
    const server = [item({ id: 'p1', price: 100, title: 'OLD' })];
    const merged = mergeCarts(local, server);
    expect(merged[0].price).toBe(150);
    expect(merged[0].title).toBe('NEW');
  });

  it('filters out items with quantity <= 0', () => {
    const local = [item({ id: 'p1', quantity: 0 }), item({ id: 'p2', quantity: -1 })];
    const server = [item({ id: 'p3', quantity: 2 })];
    expect(mergeCarts(local, server)).toEqual([item({ id: 'p3', quantity: 2 })]);
  });

  it('clamps merged quantity to maxQuantityPerItem', () => {
    const local = [item({ id: 'p1', quantity: 60 })];
    const server = [item({ id: 'p1', quantity: 60 })];
    const merged = mergeCarts(local, server, { maxQuantityPerItem: 99 });
    expect(merged[0].quantity).toBe(99);
  });

  it('deduplicates: never returns two entries with same id+variant', () => {
    const local = [
      item({ id: 'p1', selectedVariant: 'A', quantity: 1 }),
      item({ id: 'p2', quantity: 1 }),
    ];
    const server = [
      item({ id: 'p1', selectedVariant: 'A', quantity: 1 }),
      item({ id: 'p2', quantity: 1 }),
      item({ id: 'p3', quantity: 1 }),
    ];
    const merged = mergeCarts(local, server);
    const keys = merged.map(cartItemKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(merged).toHaveLength(3);
  });

  it('handles malformed items gracefully', () => {
    const local = [null as any, undefined as any, item({ id: 'p1', quantity: 1 })];
    const server = [{ id: '', quantity: 5, price: 10 } as any];
    const merged = mergeCarts(local, server);
    expect(merged).toEqual([item({ id: 'p1', quantity: 1 })]);
  });
});

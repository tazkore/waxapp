import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FEATURED_BRANDS } from '@/data/products';
import { Sparkles } from 'lucide-react';

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  brand_id: string | null;
  sku: string | null;
  created_at?: string;
}

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

const ProductGrid = () => {
  const [active, setActive] = useState('Todos');
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, description, category, price, compare_at_price, stock, image_url, brand_id, sku, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setProducts((data as DbProduct[]) ?? []);

      const { data: brandData } = await (supabase as any)
        .from('brands').select('id, name').eq('is_active', true).order('name');
      setBrands(brandData ?? []);
    };
    fetchAll();

    const channel = supabase
      .channel('products-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (products.length === 0) return { minPrice: 0, maxPrice: 1000 };
    const prices = products.map((p) => Number(p.price));
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Initialize price range when products load
  useEffect(() => {
    if (products.length > 0 && priceRange === null) {
      setPriceRange([minPrice, maxPrice]);
    }
  }, [products, minPrice, maxPrice, priceRange]);

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))];

  const filtered = useMemo(() => {
    const [pMin, pMax] = priceRange ?? [minPrice, maxPrice];
    let list = products.filter((p) => {
      const catOk = active === 'Todos' || p.category === active;
      const brandOk = activeBrand === 'all' || p.brand_id === activeBrand;
      const price = Number(p.price);
      const priceOk = price >= pMin && price <= pMax;
      const q = debouncedQuery;
      const searchOk = !q
        || p.name.toLowerCase().includes(q)
        || (p.sku ?? '').toLowerCase().includes(q)
        || (p.description ?? '').toLowerCase().includes(q);
      return catOk && brandOk && priceOk && searchOk;
    });

    switch (sort) {
      case 'price-asc':
        list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name-asc':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        // Already ordered newest from query
        break;
    }
    // Inventory-first: in-stock items always before out-of-stock, preserving previous order
    list = [...list].sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
    return list;
  }, [products, active, activeBrand, debouncedQuery, sort, priceRange, minPrice, maxPrice]);

  const hasActiveFilters =
    active !== 'Todos'
    || activeBrand !== 'all'
    || debouncedQuery.length > 0
    || sort !== 'newest'
    || (priceRange && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice));

  const clearFilters = () => {
    setActive('Todos');
    setActiveBrand('all');
    setQuery('');
    setSort('newest');
    setPriceRange([minPrice, maxPrice]);
  };

  return (
    <section id="tienda" className="py-20 scroll-mt-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Nuestra Colección
        </h2>
        <p className="mb-8 text-center text-muted-foreground max-w-lg mx-auto">
          Productos premium con la más alta calidad y tecnología de punta.
        </p>

        {/* Search + sort row */}
        <div className="mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="pl-9 bg-card border-border"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="md:w-48 bg-card border-border">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más nuevos</SelectItem>
              <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="name-asc">Nombre A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Filters panel */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block max-w-4xl mx-auto mb-6`}>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active === cat ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {brands.length > 0 && (() => {
              const featured = brands.filter((b) =>
                FEATURED_BRANDS.some((f) => b.name.toLowerCase().includes(f.toLowerCase()))
              );
              const others = brands.filter((b) => !featured.includes(b));
              return (
                <div className="space-y-2">
                  {featured.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                        <Sparkles className="h-3 w-3" /> Destacadas
                      </span>
                      {featured.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setActiveBrand(b.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            activeBrand === b.id
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-primary/40 text-primary hover:bg-primary/10'
                          }`}
                          style={activeBrand === b.id ? { boxShadow: '0 0 12px rgba(0,230,118,0.45)' } : undefined}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveBrand('all')}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        activeBrand === 'all' ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >Todas las marcas</button>
                    {others.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setActiveBrand(b.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          activeBrand === b.id ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >{b.name}</button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {priceRange && maxPrice > minPrice && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                  <span>Rango de precio</span>
                  <span className="font-mono text-foreground">
                    ${priceRange[0].toLocaleString()} – ${priceRange[1].toLocaleString()} MXN
                  </span>
                </div>
                <Slider
                  min={minPrice}
                  max={maxPrice}
                  step={50}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                  className="my-2"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between max-w-4xl mx-auto mb-4 text-xs text-muted-foreground">
          <span>{filtered.length} {filtered.length === 1 ? 'producto encontrado' : 'productos encontrados'}</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>

        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                title: p.name,
                category: p.category ?? 'General',
                price: Number(p.price),
                compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
                image_url: p.image_url,
                description: p.description ?? undefined,
              }}
              outOfStock={p.stock === 0}
            />
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-10">
            No hay productos que coincidan con tus filtros.
          </p>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;

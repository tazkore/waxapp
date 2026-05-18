import { useState, useEffect, useMemo } from "react";
import { Search, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/store/cartStore";
import { formatMXN } from "@/lib/utils";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  image_url?: string | null;
  category?: string | null;
  description?: string | null;
  brand_id?: string | null;
  is_active?: boolean;
}

type SortKey = "relevance" | "price-asc" | "price-desc" | "sale" | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "newest", label: "Más nuevos" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "sale", label: "Ofertas" },
];

function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const isOffer = product.compare_at_price && product.compare_at_price > product.price;
  const pct = isOffer ? Math.round((1 - product.price / product.compare_at_price!) * 100) : 0;

  return (
    <Link to={`/producto/${product.id}`} className="group block">
      <motion.div
        layout
        className="relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted/40">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOffer && (
              <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                −{pct}%
              </span>
            )}
            {product.stock === 0 && (
              <span className="bg-muted/80 backdrop-blur text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                Agotado
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          {product.category && (
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest mb-1">{product.category}</p>
          )}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">{product.name}</p>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-black text-primary tabular-nums">{formatMXN(product.price)}</span>
            {isOffer && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">{formatMXN(product.compare_at_price!)}</span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              if (product.stock > 0) {
                addItem({ id: product.id, title: product.name, price: product.price, image: product.image_url ?? undefined, category: product.category ?? '' });
              }
            }}
            disabled={product.stock === 0}
            className="w-full mt-3 py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {product.stock === 0 ? "Sin stock" : "Agregar al carrito"}
          </button>
        </div>
      </motion.div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-5 bg-muted rounded w-1/3 mt-1" />
        <div className="h-8 bg-muted rounded mt-2" />
      </div>
    </div>
  );
}

export default function Catalogo() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get("category") || null
  );
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, stock, image_url, category, description")
        .eq("is_active", true)
        .order("stock", { ascending: false });

      const prods = (data as Product[]) ?? [];
      setProducts(prods);

      // Extract unique categories
      const cats = [...new Set(prods.map(p => p.category).filter(Boolean))] as string[];
      setCategories(cats);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(query.toLowerCase());
      const matchOffer = !onlyOffers || (p.compare_at_price && p.compare_at_price > p.price);
      const matchStock = !onlyStock || p.stock > 0;
      const matchCat = !activeCategory || (p.category?.toLowerCase() === activeCategory.toLowerCase());
      return matchQuery && matchOffer && matchStock && matchCat;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "sale") list = [...list].sort((a, b) =>
      (b.compare_at_price && b.compare_at_price > b.price ? 1 : 0) -
      (a.compare_at_price && a.compare_at_price > a.price ? 1 : 0)
    );
    else if (sort === "relevance") {
      // Stock first, then by price
      list = [...list].sort((a, b) => {
        if (a.stock > 0 && b.stock === 0) return -1;
        if (a.stock === 0 && b.stock > 0) return 1;
        return a.price - b.price;
      });
    }

    return list;
  }, [products, query, sort, onlyOffers, onlyStock, activeCategory]);

  const activeFilters = [
    onlyOffers && "Solo ofertas",
    onlyStock && "Con stock",
    activeCategory,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Tienda</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-foreground">Catálogo</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Cargando..." : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Search & Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-card border-border"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 px-3 rounded-md bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Category pills */}
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setOnlyOffers(!onlyOffers)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              onlyOffers ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-card border-border text-muted-foreground hover:border-red-500/40'
            }`}
          >
            Solo ofertas
          </button>
          <button
            onClick={() => setOnlyStock(!onlyStock)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              onlyStock ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            Con stock
          </button>
          {activeFilters.length > 0 && (
            <button
              onClick={() => { setOnlyOffers(false); setOnlyStock(false); setActiveCategory(null); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all gap-1 flex items-center"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Package className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Sin resultados</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Prueba con otros filtros o términos de búsqueda</p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => { setQuery(""); setOnlyOffers(false); setOnlyStock(false); setActiveCategory(null); }}>
              Limpiar filtros
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i < 12 ? i * 0.03 : 0 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

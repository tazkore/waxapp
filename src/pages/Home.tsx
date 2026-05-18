import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Package, Truck, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/store/cartStore";
import { formatMXN } from "@/lib/utils";
import Navbar from "@/components/Navbar";

interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  image_url?: string | null;
  category?: string | null;
  slug?: string | null;
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const perks = [
  { icon: Package, label: "Más de 50 marcas", desc: "Mayor selección de vapes al mayoreo en México." },
  { icon: Truck, label: "Envío gratis +$1,500", desc: "A todo México en 2–4 días hábiles." },
  { icon: Star, label: "WAX Points", desc: "Acumula puntos en cada compra y canjéalos." },
  { icon: ShieldCheck, label: "Pago seguro", desc: "Transferencia, OXXO, tarjeta y SPEI." },
];

const CATEGORIES = ["THC", "CBD", "Edibles", "Accesorios", "Wax"];

function ProductCardMini({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const isOffer = product.compare_at_price && product.compare_at_price > product.price;

  return (
    <Link to={`/producto/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-muted/50">
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
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOffer && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Oferta
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
              Sin stock
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-0.5">{product.category}</p>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{product.name}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-sm font-bold text-primary tabular-nums">{formatMXN(product.price)}</span>
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
            className="w-full mt-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {product.stock === 0 ? "Sin stock" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-7 bg-muted rounded mt-2" />
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, stock, image_url, category, slug")
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(8);
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Hero */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 text-center relative">
          <motion.div {...fadeUp} className="space-y-6 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.35em] text-primary font-semibold">
              Distribuidora Mayorista — México
            </p>
            <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight">
              Vapes & Wax<br />
              <span className="text-primary">al Mayoreo</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg leading-relaxed">
              Las mejores marcas de vapes desechables, plumas de wax y accesorios premium.
              Precios de mayoreo, envío rápido, sin mínimo de compra.
            </p>
            <div className="flex gap-3 justify-center flex-wrap pt-2">
              <Button size="lg" asChild className="h-12 px-8 font-semibold gap-2">
                <Link to="/catalogo">
                  Ver Catálogo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 font-semibold border-border/60">
                <Link to="/afiliados">Programa B2B</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-10 border-y border-border/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {perks.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl hover:bg-card transition-colors">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-bold text-sm text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/catalogo?category=${cat.toLowerCase()}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 pb-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Destacados</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Productos del Momento</h2>
            </div>
            <Button variant="ghost" asChild className="gap-1.5 text-primary hover:text-primary">
              <Link to="/catalogo">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay productos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCardMini product={p} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

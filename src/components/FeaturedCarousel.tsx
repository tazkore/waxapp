import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { products as staticProducts } from '@/data/products';
import { Link } from 'react-router-dom';

interface FeaturedProduct {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
}

const FeaturedCarousel = () => {
  const [items, setItems] = useState<FeaturedProduct[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('name, description, price, category, image_url')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('featured_order')
        .limit(8);
      if (data && data.length) {
        setItems(data);
      } else {
        // Fallback to static
        setItems(staticProducts.slice(0, 4).map(p => ({
          name: p.title, description: p.description ?? null, price: p.price, category: p.category, image_url: null,
        })));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;

  const findId = (name: string) => staticProducts.find(p => p.title === name)?.id ?? '1';
  const current = items[index];

  return (
    <section className="py-16 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Top Picks</span>
        </div>
        <h2 className="mb-10 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Productos Destacados
        </h2>

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-6 rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="aspect-square md:aspect-auto bg-gradient-to-br from-primary/10 via-muted to-secondary/10 flex items-center justify-center">
              {current.image_url ? (
                <img src={current.image_url} alt={current.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-3xl text-muted-foreground/40">WAXAPP</span>
              )}
            </div>
            <div className="p-6 md:p-10 flex flex-col justify-center">
              {current.category && (
                <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  {current.category}
                </span>
              )}
              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                {current.name}
              </h3>
              {current.description && (
                <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{current.description}</p>
              )}
              <div className="text-3xl font-bold text-foreground mb-6">
                ${Number(current.price).toLocaleString()} <span className="text-sm text-muted-foreground">MXN</span>
              </div>
              <Link
                to={`/producto/${findId(current.name)}`}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 w-fit"
              >
                Ver Producto
              </Link>
            </div>
          </motion.div>

          {items.length > 1 && (
            <>
              <button
                onClick={() => setIndex(i => (i - 1 + items.length) % items.length)}
                className="absolute -left-2 md:-left-12 top-1/2 -translate-y-1/2 rounded-full bg-card border border-border p-2 hover:bg-muted transition"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={() => setIndex(i => (i + 1) % items.length)}
                className="absolute -right-2 md:-right-12 top-1/2 -translate-y-1/2 rounded-full bg-card border border-border p-2 hover:bg-muted transition"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
              <div className="flex justify-center gap-2 mt-6">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;

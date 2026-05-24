import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ClientRecommendations() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, price, compare_at_price, image_url, category, is_featured')
          .eq('is_active', true)
          .order('featured_order', { ascending: true })
          .limit(4);

        if (!error && data) {
          setProducts(data);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="mt-12 w-full">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Recomendados para ti
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card/40 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-12 w-full">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" /> Recomendados para ti
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link to={`/producto/${product.slug}`} className="block h-full group">
              <Card className="h-full bg-card/40 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col relative group-hover:shadow-lg group-hover:shadow-primary/5">
                {product.compare_at_price > product.price && (
                  <Badge className="absolute top-2 right-2 z-10 bg-destructive/90 text-destructive-foreground border-none">
                    Oferta
                  </Badge>
                )}
                <div className="aspect-square bg-muted/30 p-4 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      Sin imagen
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="gap-2 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      <ShoppingCart className="h-4 w-4" /> Ver producto
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3 md:p-4 flex flex-col flex-grow justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 truncate">
                      {product.category || 'Vape'}
                    </p>
                    <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="font-bold text-foreground text-sm">
                      ${product.price.toLocaleString()}
                    </span>
                    {product.compare_at_price > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${product.compare_at_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

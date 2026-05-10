import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore, type Product } from '@/store/cartStore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const EmptyCartRecommendations = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('products')
        .select('id,name,price,image_url,category')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(4);
      if (dbError) throw dbError;
      setItems(
        (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.name,
          price: Number(p.price),
          image: p.image_url,
          category: p.category || 'general',
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (!loading && !error && items.length === 0) return null;

  return (
    <section
      className="mx-auto w-full max-w-xs space-y-2 text-left"
      aria-label="Productos recomendados"
      aria-live="polite"
      aria-busy={loading}
    >
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        Los favoritos del mes
      </h4>

      {loading && (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-14 rounded-md" />
            </li>
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <p className="text-xs text-foreground">No pudimos cargar recomendaciones</p>
          <button
            onClick={loadRecommendations}
            className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-accent">
                {p.image ? (
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-primary">${p.price.toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  addItem(p, 1);
                  toast.success('Agregado al carrito', { description: p.title });
                }}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Agregar ${p.title} al carrito`}
              >
                <Plus className="h-3 w-3" aria-hidden="true" /> Agregar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EmptyCartRecommendations;

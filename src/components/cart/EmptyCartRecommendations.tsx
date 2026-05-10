import { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore, type Product } from '@/store/cartStore';
import { toast } from 'sonner';

const EmptyCartRecommendations = () => {
  const [items, setItems] = useState<Product[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name,price,image_url,category')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(4);
      if (data) {
        setItems(
          data.map((p: any) => ({
            id: p.id,
            title: p.name,
            price: Number(p.price),
            image: p.image_url,
            category: p.category || 'general',
          }))
        );
      }
    })();
  }, []);

  if (!items.length) return null;

  return (
    <section
      className="mx-auto w-full max-w-xs space-y-2 text-left"
      aria-label="Productos recomendados"
    >
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        Los favoritos del mes
      </h4>
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
    </section>
  );
};

export default EmptyCartRecommendations;

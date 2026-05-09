import { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore, type Product } from '@/store/cartStore';

const UpsellStrip = () => {
  const [items, setItems] = useState<Product[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name,price,image_url,category,brand_id')
        .lte('price', 300)
        .gt('stock', 0)
        .limit(2);
      if (data) {
        setItems(
          data.map((p: any) => ({
            id: p.id,
            title: p.name,
            price: Number(p.price),
            image: p.image_url,
            category: p.category || 'accesorios',
          }))
        );
      }
    })();
  }, []);

  if (!items.length) return null;

  return (
    <div className="border-t border-border px-4 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-secondary" />
        Complementa tu experiencia
      </p>
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
              onClick={() => addItem(p, 1)}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              aria-label={`Agregar ${p.title}`}
            >
              <Plus className="h-3 w-3" /> Agregar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpsellStrip;

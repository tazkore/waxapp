import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { products as staticProducts } from '@/data/products';
import ProductCard from './ProductCard';

const categories = ['Todos', 'Nano-Tech', 'Comestibles', 'Hardware'];

interface DbInfo { stock: number; image_url: string | null; brand_id: string | null; }

const ProductGrid = () => {
  const [active, setActive] = useState('Todos');
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [dbInfo, setDbInfo] = useState<Record<string, DbInfo>>({});
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from('products').select('name, stock, image_url, brand_id');
      if (data) {
        const map: Record<string, DbInfo> = {};
        data.forEach((p: any) => { map[p.name] = { stock: p.stock, image_url: p.image_url, brand_id: p.brand_id }; });
        setDbInfo(map);
      }
      const { data: brandData } = await (supabase as any).from('brands').select('id, name').eq('is_active', true).order('name');
      setBrands(brandData ?? []);
    };
    fetchAll();

    const channel = supabase
      .channel('products-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const productsWithDb = staticProducts.map(p => ({
    ...p,
    stock: dbInfo[p.title]?.stock ?? 999,
    image_url: dbInfo[p.title]?.image_url ?? null,
    brand_id: dbInfo[p.title]?.brand_id ?? null,
  }));

  const filtered = productsWithDb.filter((p) => {
    const catOk = active === 'Todos' || p.category === active;
    const brandOk = activeBrand === 'all' || p.brand_id === activeBrand;
    return catOk && brandOk;
  });

  return (
    <section id="tienda" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Nuestra Colección
        </h2>
        <p className="mb-8 text-center text-muted-foreground max-w-lg mx-auto">
          Productos premium con la más alta calidad y tecnología de punta.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active === cat ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {brands.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            <button
              onClick={() => setActiveBrand('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                activeBrand === 'all' ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >Todas las marcas</button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  activeBrand === b.id ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'
                }`}
              >{b.name}</button>
            ))}
          </div>
        )}

        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} outOfStock={(p as any).stock === 0} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProductGrid;

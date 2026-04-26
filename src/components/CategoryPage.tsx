import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { Leaf, Sparkles, ShieldCheck } from 'lucide-react';

interface Props { category: string; title: string; subtitle: string; intro: string; }

const CategoryPage = ({ category, title, subtitle, intro }: Props) => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, description, category, price, compare_at_price, stock, image_url')
        .eq('is_active', true)
        .eq('category', category);
      setProducts(data ?? []);
    })();
  }, [category]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      </header>

      <section className="container mx-auto px-4 pb-12 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Leaf, label: 'Origen vegetal' },
            { icon: Sparkles, label: 'Nano biodisponibilidad' },
            { icon: ShieldCheck, label: 'Lab-tested certificado' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-border bg-card p-5 text-center">
              <f.icon className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">{f.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-muted-foreground">{intro}</p>
      </section>

      <section className="container mx-auto px-4 pb-20">
        {products.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Próximamente más productos en esta categoría.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={{
                id: p.id, title: p.name, category: p.category ?? category,
                price: Number(p.price), compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
                image_url: p.image_url, description: p.description ?? undefined,
              }} outOfStock={p.stock === 0} />
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default CategoryPage;

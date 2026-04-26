import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
}

const BrandsStrip = () => {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('brands')
        .select('id, name, logo_url, website')
        .eq('is_active', true)
        .order('display_order');
      setBrands((data ?? []).filter((b: Brand) => b.logo_url));
    })();
  }, []);

  if (!brands.length) return null;

  // duplicate for seamless infinite scroll
  const loop = [...brands, ...brands];

  return (
    <section className="py-10 border-y border-border bg-card/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Marcas premium que distribuimos
        </p>
      </div>
      <div className="relative">
        <div className="flex gap-12 animate-marquee whitespace-nowrap" style={{ width: 'max-content' }}>
          {loop.map((b, i) => {
            const inner = (
              <div key={`${b.id}-${i}`} className="h-16 w-32 flex items-center justify-center grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition shrink-0">
                <img src={b.logo_url!} alt={b.name} className="max-h-full max-w-full object-contain" />
              </div>
            );
            return b.website ? (
              <a key={`${b.id}-${i}`} href={b.website} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : inner;
          })}
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;

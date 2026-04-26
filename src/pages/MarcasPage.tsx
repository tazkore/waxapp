import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import neshikaLogo from '@/assets/neshika-logo.png';
import { Sparkles } from 'lucide-react';

interface Brand { id: string; name: string; slug: string; description: string | null; logo_url: string | null; is_featured: boolean; }

const MarcasPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('display_order');
      setBrands((data as Brand[]) ?? []);
    })();
  }, []);

  const neshika = brands.find((b) => b.slug === 'neshika');
  const others = brands.filter((b) => b.slug !== 'neshika');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Marcas Premium</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Curamos marcas líderes del mundo y creamos las nuestras propias.
          </p>
        </header>

        {neshika && (
          <Link to="/neshika"
            className="block max-w-3xl mx-auto mb-12 rounded-2xl border-2 border-[#00E676]/40 bg-card p-8 text-center transition-all hover:border-[#00E676] hover:shadow-[0_0_40px_rgba(0,230,118,0.25)]">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-semibold">
              <Sparkles className="h-3 w-3" /> MARCA INSIGNIA WAXAPP
            </div>
            <img src={neshikaLogo} alt="Neshika" className="h-32 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(0,230,118,0.2)]" />
            <h2 className="font-display text-3xl font-bold">{neshika.name}</h2>
            <p className="mt-2 text-muted-foreground">{neshika.description}</p>
            <span className="mt-4 inline-block text-[#00E676] text-sm font-medium">Conoce Neshika →</span>
          </Link>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {others.map((b) => (
            <article key={b.id} className="rounded-xl border border-border bg-card p-5 text-center hover:border-primary/40 transition-colors">
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name} className="h-16 mx-auto mb-3 object-contain" />
              ) : (
                <div className="h-16 flex items-center justify-center mb-3"><span className="font-display text-2xl text-muted-foreground">{b.name[0]}</span></div>
              )}
              <h3 className="font-semibold">{b.name}</h3>
              {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarcasPage;

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  image_path: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
}

const PromoBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('banners')
        .select('id, image_path, title, subtitle, cta_text, cta_url')
        .eq('is_active', true)
        .order('display_order');
      setBanners(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;
  const b = banners[index];

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="relative h-[280px] md:h-[420px] rounded-2xl overflow-hidden border border-border group">
          <AnimatePresence mode="wait">
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              <img src={b.image_path} alt={b.title ?? ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-6 md:px-10">
                  <div className="max-w-md space-y-3">
                    {b.title && (
                      <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && <p className="text-sm md:text-base text-muted-foreground">{b.subtitle}</p>}
                    {b.cta_text && b.cta_url && (
                      <a
                        href={b.cta_url}
                        className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition"
                      >
                        {b.cta_text}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {banners.length > 1 && (
            <>
              <button
                onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur p-2 opacity-0 group-hover:opacity-100 transition border border-border"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % banners.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur p-2 opacity-0 group-hover:opacity-100 transition border border-border"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-primary' : 'w-1.5 bg-foreground/30'}`}
                    aria-label={`Banner ${i + 1}`}
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

export default PromoBanners;

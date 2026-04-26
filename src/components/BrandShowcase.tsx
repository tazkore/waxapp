import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const img = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;

const showcase = [
  {
    name: 'KRT Live Diamonds',
    flavor: 'Horchata · Hybrid',
    badge: '2G',
    image: img('products/krt-horchata.jpg'),
    accent: 'from-amber-500/30 to-yellow-700/10',
  },
  {
    name: 'BOUTIQ Switch',
    flavor: 'Bubblegum Runtz × Rainbow Belts',
    badge: '2.0G Dual',
    image: img('products/boutiq-switch-bubblegum.webp'),
    accent: 'from-cyan-500/30 to-fuchsia-500/10',
  },
  {
    name: 'ELF THC',
    flavor: 'Grape Slurp #4 · Indica',
    badge: '3000MG',
    image: img('products/elfthc-grape-slurp.webp'),
    accent: 'from-fuchsia-500/30 to-purple-700/10',
  },
  {
    name: 'ELF THC',
    flavor: 'Octane Orange XL · Hybrid',
    badge: '3000MG',
    image: img('products/elfthc-octane-orange.webp'),
    accent: 'from-orange-500/30 to-red-600/10',
  },
  {
    name: 'ELF THC',
    flavor: 'Razz Tiger Express · Sativa',
    badge: '3000MG',
    image: img('products/elfthc-razz-tiger.webp'),
    accent: 'from-sky-500/30 to-blue-700/10',
  },
  {
    name: 'FUME Extracts',
    flavor: 'Blue Raspberry Gelato · Live Resin',
    badge: '2ML',
    image: img('products/fume-blue-raspberry.webp'),
    accent: 'from-blue-500/30 to-indigo-700/10',
  },
];

const BrandShowcase = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Tech grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Premium Vape Collection
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Plumas THC <span className="text-primary">Top Tier</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Importadas directamente de California. Lab tested, live resin, diamantes líquidos.
            La experiencia más limpia y potente del mercado.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {showcase.map((p, i) => (
            <motion.div
              key={p.image}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]"
            >
              {/* Accent glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative aspect-[4/5] flex items-center justify-center bg-gradient-to-b from-muted/30 to-background overflow-hidden">
                <img
                  src={p.image}
                  alt={`${p.name} ${p.flavor}`}
                  loading="lazy"
                  className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700"
                />
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-background/80 backdrop-blur border border-primary/30 text-primary">
                  {p.badge}
                </span>
              </div>

              <div className="relative p-4 md:p-5 border-t border-border">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  {p.name}
                </p>
                <p className="font-display text-sm md:text-base font-bold text-foreground line-clamp-2">
                  {p.flavor}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/tienda"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandShowcase;

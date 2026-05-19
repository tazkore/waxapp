import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const img = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;

type Strain = 'Hybrid' | 'Indica' | 'Sativa' | 'Live Resin';

const strainColor: Record<Strain, string> = {
  Hybrid: 'text-primary border-primary/30',
  Indica: 'text-[hsl(263_80%_70%)] border-[hsl(263_80%_60%/0.3)]',
  Sativa: 'text-amber-400 border-amber-400/30',
  'Live Resin': 'text-cyan-400 border-cyan-400/30',
};

const showcase: { name: string; flavor: string; badge: string; image: string; accent: string; strain: Strain }[] = [
  {
    name: 'KRT Live Diamonds',
    flavor: 'Horchata · Hybrid',
    badge: '2G',
    image: img('products/krt-horchata.jpg'),
    accent: 'from-amber-500/30 to-yellow-700/10',
    strain: 'Hybrid',
  },
  {
    name: 'BOUTIQ Switch',
    flavor: 'Bubblegum Runtz × Rainbow Belts',
    badge: '2.0G Dual',
    image: img('products/boutiq-switch-bubblegum.webp'),
    accent: 'from-cyan-500/30 to-fuchsia-500/10',
    strain: 'Hybrid',
  },
  {
    name: 'ELF THC',
    flavor: 'Grape Slurp #4 · Indica',
    badge: '3000MG',
    image: img('products/elfthc-grape-slurp.webp'),
    accent: 'from-fuchsia-500/30 to-purple-700/10',
    strain: 'Indica',
  },
  {
    name: 'ELF THC',
    flavor: 'Octane Orange XL · Hybrid',
    badge: '3000MG',
    image: img('products/elfthc-octane-orange.webp'),
    accent: 'from-orange-500/30 to-red-600/10',
    strain: 'Hybrid',
  },
  {
    name: 'ELF THC',
    flavor: 'Razz Tiger Express · Sativa',
    badge: '3000MG',
    image: img('products/elfthc-razz-tiger.webp'),
    accent: 'from-sky-500/30 to-blue-700/10',
    strain: 'Sativa',
  },
  {
    name: 'FUME Extracts',
    flavor: 'Blue Raspberry Gelato · Live Resin',
    badge: '2ML',
    image: img('products/fume-blue-raspberry.webp'),
    accent: 'from-blue-500/30 to-indigo-700/10',
    strain: 'Live Resin',
  },
];

const [hero, ...rest] = showcase;

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
      {/* Violet radial hint */}
      <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full bg-[hsl(263_80%_60%/0.04)] blur-[100px] pointer-events-none" />

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

        {/* Hero card — first product, full width horizontal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-700 hover:shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5)] mb-6"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${hero.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="relative flex flex-col md:flex-row">
            {/* Text side */}
            <div className="flex-1 flex flex-col justify-center gap-4 p-8 md:p-12">
              <span className={`self-start px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${strainColor[hero.strain]}`}>
                {hero.strain}
              </span>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{hero.name}</p>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {hero.flavor}
              </h3>
              <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {hero.badge}
              </span>
              <Link
                to="/tienda"
                className="self-start mt-2 px-6 py-2.5 bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wide hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all duration-300"
              >
                Ver producto
              </Link>
            </div>
            {/* Image side */}
            <div className="relative w-full md:w-80 aspect-square flex items-center justify-center bg-gradient-to-b from-muted/30 to-background overflow-hidden">
              <img
                src={hero.image}
                alt={`${hero.name} ${hero.flavor}`}
                loading="lazy"
                className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </motion.div>

        {/* Rest: 5-col compact grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {rest.map((p, i) => (
            <motion.div
              key={p.image}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-700 hover:shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5)]"
            >
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

              <div className="relative p-4 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{p.name}</p>
                  <span className={`shrink-0 ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${strainColor[p.strain]}`}>
                    {p.strain}
                  </span>
                </div>
                <p className="font-display text-sm font-bold text-foreground line-clamp-2">
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

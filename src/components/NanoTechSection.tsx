import { motion } from 'framer-motion';
import { Hourglass, Zap } from 'lucide-react';

const MolecularSVG = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 800 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
    style={{ opacity: 0.04 }}
  >
    <circle cx="100" cy="100" r="6" fill="hsl(145 100% 45%)" />
    <circle cx="300" cy="80" r="4" fill="hsl(145 100% 45%)" />
    <circle cx="500" cy="150" r="7" fill="hsl(145 100% 45%)" />
    <circle cx="700" cy="60" r="5" fill="hsl(145 100% 45%)" />
    <circle cx="200" cy="280" r="5" fill="hsl(145 100% 45%)" />
    <circle cx="450" cy="350" r="8" fill="hsl(145 100% 45%)" />
    <circle cx="650" cy="300" r="4" fill="hsl(145 100% 45%)" />
    <circle cx="50" cy="400" r="6" fill="hsl(145 100% 45%)" />
    <circle cx="750" cy="420" r="5" fill="hsl(145 100% 45%)" />
    <circle cx="350" cy="450" r="4" fill="hsl(145 100% 45%)" />
    <line x1="100" y1="100" x2="300" y2="80" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="300" y1="80" x2="500" y2="150" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="500" y1="150" x2="700" y2="60" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="100" y1="100" x2="200" y2="280" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="200" y1="280" x2="450" y2="350" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="450" y1="350" x2="650" y2="300" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="650" y1="300" x2="750" y2="420" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="450" y1="350" x2="350" y2="450" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="50" y1="400" x2="200" y2="280" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="300" y1="80" x2="200" y2="280" stroke="hsl(145 100% 45%)" strokeWidth="1" />
    <line x1="500" y1="150" x2="450" y2="350" stroke="hsl(145 100% 45%)" strokeWidth="1" />
  </svg>
);

const NanoTechSection = () => {
  return (
    <section id="nano" className="relative bg-background overflow-hidden">
      <MolecularSVG />

      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="pt-24 pb-12 max-w-3xl"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ingeniería Molecular.{' '}
            <span className="text-primary">Absorción Inmediata</span>.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            No vendemos aceites tradicionales. Utilizamos Nanotecnología de Emulsión
            para reducir las partículas a un tamaño soluble en agua, logrando una
            biodisponibilidad del 90%.
          </p>
        </motion.div>

        {/* Split-screen cinematic */}
        <div className="relative grid md:grid-cols-2 rounded-2xl overflow-hidden border border-border">
          {/* Left: Comestibles Comunes (muted/grayscale feel) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-5 p-8 md:p-12 bg-muted/20"
          >
            <div className="p-3 rounded-lg bg-muted/50 self-start">
              <Hourglass className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold text-muted-foreground">
              Comestibles Tradicionales
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Absorción del 15%. Tiempo de espera: 60–90 minutos. La mayor parte
              del compuesto se pierde en la digestión antes de llegar al torrente sanguíneo.
            </p>
            <div className="mt-auto pt-6 flex gap-8">
              <div>
                <span className="font-display text-3xl font-bold text-muted-foreground">15%</span>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Absorción</p>
              </div>
              <div>
                <span className="font-display text-3xl font-bold text-muted-foreground">60-90 min</span>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Espera</p>
              </div>
            </div>
          </motion.div>

          {/* Central divider: desktop only */}
          <div className="hidden md:block absolute left-1/2 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-primary to-transparent opacity-30 pointer-events-none" />

          {/* Right: Nano-Fórmulas WAXAPP */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col gap-5 p-8 md:p-12 bg-primary/5 border-t border-primary/20 md:border-t-0 md:border-l md:border-primary/20"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-3 rounded-lg bg-primary/10 self-start">
                <Zap
                  className="w-6 h-6 text-primary"
                  style={{ filter: 'drop-shadow(0 0 8px hsl(145 100% 45% / 0.7))' }}
                />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-primary/30 text-primary bg-primary/5">
                EFECTO CERTIFICADO
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Nano-Fórmulas WAXAPP
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Absorción del 90%. Tiempo de acción: menos de 5 minutos. Partículas
              nano-emulsionadas que se absorben directamente a nivel celular.
            </p>
            <div className="mt-auto pt-6 flex gap-8 items-end">
              <div>
                <span
                  className="font-display text-5xl md:text-6xl font-bold text-primary"
                  style={{ filter: 'drop-shadow(0 0 12px hsl(145 100% 45% / 0.5))' }}
                >
                  90%
                </span>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Absorción</p>
              </div>
              <div className="pb-1">
                <span className="font-display text-3xl font-bold text-primary">&lt; 5 min</span>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Acción</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pb-24" />
      </div>
    </section>
  );
};

export default NanoTechSection;

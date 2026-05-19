import { motion } from 'framer-motion';
import logoImg from '@/assets/logo_waxapp.jpg';

const marqueeItems = [
  'NANO-EMULSIÓN',
  '90% BIODISPONIBILIDAD',
  'CERTIFICADO DE ANÁLISIS',
  'ENVÍO DISCRETO',
  'HECHO EN CALIFORNIA',
  'LEGAL EN MÉXICO',
  'HARDWARE DE ALTA GAMA',
  'LIVE RESIN · LIVE DIAMONDS',
];

const HeroSection = () => (
  <section className="relative overflow-hidden min-h-screen flex flex-col">
    {/* Atmospheric orbs */}
    <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
    <div className="absolute top-[10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-[hsl(263_80%_60%/0.08)] blur-[100px] pointer-events-none" />
    <div className="absolute bottom-[10%] left-[30%] w-[20vw] h-[20vw] rounded-full bg-[hsl(40_100%_50%/0.05)] blur-[80px] pointer-events-none" />

    {/* Main content */}
    <div className="flex-1 container mx-auto grid md:grid-cols-[55%_45%] gap-8 px-4 pt-28 pb-20 items-center">
      {/* Left: headline + CTAs */}
      <div className="space-y-8">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="block font-display text-[10px] tracking-[0.3em] uppercase text-primary/80"
        >
          WAXAPP · Mexico City · EST. 2024
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="font-display text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.9] uppercase tracking-tight text-foreground block">
            La Evolución
          </span>
          <span className="font-editorial italic text-[clamp(2.2rem,6.5vw,5rem)] font-light text-gradient-prism block leading-[1.1]">
            del bienestar.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="font-sans text-base text-muted-foreground max-w-[420px] leading-relaxed"
        >
          Fórmulas con Nanotecnología y Hardware de Alta Gama. Legal, rápido y seguro.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap gap-4"
        >
          <a
            href="#tienda"
            className="bg-primary text-primary-foreground px-8 py-4 font-display font-bold text-sm uppercase tracking-wide hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all duration-300"
          >
            Explorar
          </a>
          <a
            href="#nano"
            className="border border-primary/30 text-primary px-8 py-4 font-display font-bold text-sm uppercase tracking-wide hover:bg-primary/5 transition-all duration-300"
          >
            Tecnología →
          </a>
        </motion.div>
      </div>

      {/* Right: floating image with halos + labels */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative flex items-center justify-center py-16"
      >
        {/* Outer halo: green pulsing ring */}
        <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-pulse-neon" />
        {/* Inner ring: violet */}
        <div className="absolute inset-4 rounded-xl border border-[hsl(263_80%_60%/0.15)]" />

        <img
          src={logoImg}
          alt="WAXAPP"
          className="w-64 md:w-80 rounded-2xl float-anim relative z-10 shadow-[0_0_80px_hsl(var(--primary)/0.2)]"
        />

        {/* Floating label: clients */}
        <div
          className="absolute -right-2 md:-right-4 top-[28%] bg-card/90 backdrop-blur border border-primary/20 rounded-xl px-3 py-2 text-xs font-display font-bold text-primary float-anim z-20"
          style={{ animationDelay: '1s' }}
        >
          +1,200 clientes ✓
        </div>

        {/* Floating label: COA */}
        <div
          className="absolute -left-2 md:-left-4 bottom-[28%] bg-card/90 backdrop-blur border border-[hsl(263_80%_60%/0.3)] rounded-xl px-3 py-2 text-xs font-display font-bold text-[hsl(263_80%_70%)] float-anim z-20"
          style={{ animationDelay: '2s' }}
        >
          COA Certified
        </div>
      </motion.div>
    </div>

    {/* Marquee bottom */}
    <div className="border-t border-border/50 bg-card/40 backdrop-blur overflow-hidden">
      <div className="flex animate-marquee-scroll whitespace-nowrap py-3">
        {[0, 1].map((r) => (
          <span key={r} className="flex gap-12 mr-12 shrink-0">
            {marqueeItems.map((t) => (
              <span key={t} className="font-display text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                {t} <span className="text-primary mx-4">·</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;

import { motion } from 'framer-motion';
import logoImg from '@/assets/logo_waxapp.jpg';

const HeroSection = () => (
  <section className="relative overflow-hidden py-20 md:py-32">
    <div className="container mx-auto flex flex-col items-center gap-12 px-4 md:flex-row">
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="flex-1 space-y-6"
      >
        <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-6xl">
          La Evolución del Bienestar.{' '}
          <span className="text-gradient-neon">Ahora en México.</span>
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          Fórmulas con Nanotecnología y Hardware de Alta Gama. Legal, rápido y seguro.
        </p>
        <a
          href="#tienda"
          className="inline-block rounded-lg bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:neon-glow hover:brightness-110"
        >
          Explorar Colección
        </a>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex flex-1 justify-center"
      >
        <img
          src={logoImg}
          alt="WAXAPP Logo"
          className="w-72 rounded-2xl md:w-96"
        />
      </motion.div>
    </div>
  </section>
);

export default HeroSection;

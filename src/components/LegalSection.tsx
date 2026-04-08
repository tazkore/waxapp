import { motion } from 'framer-motion';
import { Shield, FileText, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const pillars = [
  {
    icon: Shield,
    title: 'Cumplimiento Normativo',
    description:
      'Operamos bajo amparos vigentes y regulaciones sanitarias. 100% legal en México.',
  },
  {
    icon: FileText,
    title: 'Transparencia Fiscal',
    description:
      'Somos una empresa constituida. Emitimos Factura (CFDI) en todas tus compras.',
  },
  {
    icon: Package,
    title: 'Envíos Asegurados',
    description:
      'Empaque discreto sin logos externos. Si tu paquete se extravía, lo reponemos sin costo.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const LegalSection = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-14 text-center"
        >
          Legalidad y Confianza<span className="text-primary">.</span>
        </motion.h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {pillars.map((p) => (
            <motion.div key={p.title} variants={item}>
              <Card className="bg-card border-border h-full transition-all duration-300 hover:border-primary/60 hover:neon-glow">
                <CardContent className="p-8 flex flex-col items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{p.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LegalSection;

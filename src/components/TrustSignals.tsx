import { Zap, ShieldCheck, FileText, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const signals = [
  { icon: Zap, text: 'Efecto en < 5 Minutos' },
  { icon: ShieldCheck, text: 'Legal y Certificado' },
  { icon: FileText, text: 'Facturación CFDI' },
  { icon: Package, text: 'Envíos Asegurados' },
];

const TrustSignals = () => (
  <section className="border-y border-border bg-card py-8">
    <div className="container mx-auto grid grid-cols-2 gap-6 px-4 md:grid-cols-4">
      {signals.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <s.icon className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium text-foreground">{s.text}</span>
        </motion.div>
      ))}
    </div>
  </section>
);

export default TrustSignals;

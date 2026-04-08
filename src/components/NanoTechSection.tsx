import { motion } from 'framer-motion';
import { Hourglass, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const NanoTechSection = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ingeniería Molecular. Absorción Inmediata
            <span className="text-primary">.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            No vendemos aceites tradicionales. Utilizamos Nanotecnología de Emulsión
            para reducir las partículas a un tamaño soluble en agua, logrando una
            biodisponibilidad del 90%.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card border-border h-full">
              <CardContent className="p-8 flex flex-col items-start gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Hourglass className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Comestibles Comunes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Absorción del 15%. Tiempo de espera: 60-90 minutos. La mayor parte
                  del compuesto se pierde en la digestión antes de llegar al torrente sanguíneo.
                </p>
                <div className="mt-auto pt-4 flex gap-6">
                  <div>
                    <span className="text-2xl font-bold text-muted-foreground">15%</span>
                    <p className="text-sm text-muted-foreground">Absorción</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-muted-foreground">60-90 min</span>
                    <p className="text-sm text-muted-foreground">Espera</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Card className="bg-card border-primary/40 neon-glow h-full">
              <CardContent className="p-8 flex flex-col items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Nano-Fórmulas WAXAPP
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Absorción del 90%. Tiempo de acción: menos de 5 minutos. Partículas
                  nano-emulsionadas que se absorben directamente a nivel celular.
                </p>
                <div className="mt-auto pt-4 flex gap-6">
                  <div>
                    <span className="text-2xl font-bold text-primary">90%</span>
                    <p className="text-sm text-muted-foreground">Absorción</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary">&lt; 5 min</span>
                    <p className="text-sm text-muted-foreground">Acción</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default NanoTechSection;

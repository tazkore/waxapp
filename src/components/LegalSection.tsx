import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Package, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LegalModal from './LegalModal';
import { LEGAL_DOCS, type LegalKey } from '@/lib/legalContent';

const pillars: Array<{
  key: LegalKey;
  icon: typeof Shield;
  title: string;
  description: string;
}> = [
  {
    key: 'compliance',
    icon: Shield,
    title: 'Cumplimiento Normativo',
    description:
      'Operamos bajo amparos vigentes y regulaciones sanitarias. 100% legal en México.',
  },
  {
    key: 'privacy',
    icon: FileText,
    title: 'Aviso de Privacidad',
    description:
      'Protegemos tus datos conforme a la LFPDPPP. Conoce cómo los tratamos.',
  },
  {
    key: 'terms',
    icon: Package,
    title: 'Términos y Condiciones',
    description:
      'Política de envíos discretos, devoluciones y garantías de reposición.',
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
  const [openKey, setOpenKey] = useState<LegalKey | null>(null);
  const [accepted, setAccepted] = useState<Record<LegalKey, boolean>>({
    compliance: false,
    privacy: false,
    terms: false,
  });

  useEffect(() => {
    const next = { ...accepted };
    (Object.keys(LEGAL_DOCS) as LegalKey[]).forEach((k) => {
      next[k] = !!localStorage.getItem(LEGAL_DOCS[k].storageKey);
    });
    setAccepted(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="legal" className="py-24 px-4 md:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center"
        >
          Legalidad y Confianza<span className="text-primary">.</span>
        </motion.h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Haz clic en cada tarjeta para leer y aceptar nuestros documentos.
        </p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {pillars.map((p) => (
            <motion.div key={p.key} variants={item}>
              <button
                type="button"
                onClick={() => setOpenKey(p.key)}
                className="text-left w-full h-full"
              >
                <Card className="bg-card border-border h-full transition-all duration-300 hover:border-primary/60 hover:neon-glow cursor-pointer">
                  <CardContent className="p-8 flex flex-col items-start gap-4 h-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p.icon className="w-6 h-6 text-primary" />
                      </div>
                      {accepted[p.key] && (
                        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
                          <Check className="w-3 h-3 mr-1" />
                          Aceptado
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {p.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                    <span className="text-xs font-mono text-primary mt-auto">
                      Leer documento →
                    </span>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <LegalModal
        docKey={openKey}
        open={openKey !== null}
        onOpenChange={(o) => !o && setOpenKey(null)}
        onAccepted={(k) => setAccepted((prev) => ({ ...prev, [k]: true }))}
      />
    </section>
  );
};

export default LegalSection;

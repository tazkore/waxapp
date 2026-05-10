import { useState } from 'react';
import { Zap, ShieldCheck, BadgeCheck, Package, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SignalInfo {
  title: string;
  description: string;
  bullets: string[];
}

interface Signal {
  icon: LucideIcon;
  text: string;
  info: SignalInfo;
}

const signals: Signal[] = [
  {
    icon: Zap,
    text: 'Efecto en < 5 Minutos',
    info: {
      title: 'Absorción ultra rápida',
      description:
        'Nuestra tecnología de nano-emulsión permite que el principio activo se asimile en menos de 5 minutos, muy por encima de los productos tradicionales.',
      bullets: [
        'Biodisponibilidad hasta 10× mayor que aceites convencionales.',
        'Activación sublingual sin pasar por el sistema digestivo.',
        'Efecto consistente y predecible dosis a dosis.',
      ],
    },
  },
  {
    icon: ShieldCheck,
    text: 'Legal y Certificado',
    info: {
      title: 'Cumplimiento legal completo',
      description:
        'Operamos dentro del marco regulatorio mexicano. Cada producto cuenta con análisis y documentación que respalda su composición y seguridad.',
      bullets: [
        'Análisis de laboratorio de terceros por lote (COA).',
        'Cumplimiento con normativa COFEPRIS aplicable.',
        'Trazabilidad completa desde origen hasta entrega.',
      ],
    },
  },
  {
    icon: BadgeCheck,
    text: 'Producto 100% Original',
    info: {
      title: 'Garantía de autenticidad',
      description:
        'Cada unidad es 100% original, sellada de fábrica y verificada. Trabajamos directamente con los laboratorios fabricantes — nunca con intermediarios.',
      bullets: [
        'Sellos de seguridad y código de lote en cada empaque.',
        'Verifica autenticidad escaneando el QR del producto.',
        'Garantía de devolución si detectas cualquier inconsistencia.',
        'Compra directa al fabricante: sin réplicas, sin imitaciones.',
      ],
    },
  },
  {
    icon: Package,
    text: 'Envíos Asegurados',
    info: {
      title: 'Logística protegida',
      description:
        'Todos los envíos están asegurados contra pérdida o daño. Empacamos discretamente y entregamos en cualquier punto de la república mexicana.',
      bullets: [
        'Cobertura total contra pérdida, robo o daño en tránsito.',
        'Empaque discreto y resistente, sin marcas externas.',
        'Tracking en tiempo real desde tu cuenta.',
        'Reposición inmediata si algo sale mal.',
      ],
    },
  },
];

const TrustSignals = () => {
  const [active, setActive] = useState<Signal | null>(null);
  const ActiveIcon = active?.icon;

  return (
    <>
      <section className="border-y border-border bg-card py-8">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 md:grid-cols-4">
          {signals.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => setActive(s)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col items-center gap-2 text-center rounded-lg p-3 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label={`Más información sobre ${s.text}`}
              >
                <Icon className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {s.text}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md bg-card border-primary/20">
          {active && ActiveIcon && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                    <ActiveIcon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-lg">{active.info.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{active.text}</p>
                  </div>
                </div>
                <DialogDescription className="text-sm pt-3 text-foreground/80">
                  {active.info.description}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-2 py-2">
                {active.info.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_hsl(var(--primary))]" />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>

              <DialogFooter>
                <Button onClick={() => setActive(null)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Entendido
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrustSignals;

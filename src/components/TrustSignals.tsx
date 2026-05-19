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
  value: string;
  unit: string;
  label: string;
  info: SignalInfo;
}

const signals: Signal[] = [
  {
    icon: Zap,
    value: '< 5',
    unit: 'min',
    label: 'Efecto activo',
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
    value: '90',
    unit: '%',
    label: 'Biodisponibilidad',
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
    value: '100',
    unit: '%',
    label: 'Original & Legal',
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
    value: '1-3',
    unit: 'días',
    label: 'Entrega nacional',
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
      <section className="border-y border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4">
          {signals.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => setActive(s)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={[
                  'group flex flex-col items-center gap-2 py-8 px-4 text-center',
                  'hover:bg-primary/5 transition-all duration-300 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  i < 3 ? 'border-r border-border/50' : '',
                ].join(' ')}
                aria-label={`Más información sobre ${s.label}`}
              >
                <Icon className="h-5 w-5 text-primary/60 mb-1 group-hover:text-primary transition-colors" />
                <div className="flex items-end gap-1 leading-none">
                  <span className="font-display text-4xl md:text-5xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {s.value}
                  </span>
                  <span className="font-display text-lg text-primary mb-0.5">{s.unit}</span>
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                  {s.label}
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {active.value}{active.unit} · {active.label}
                    </p>
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

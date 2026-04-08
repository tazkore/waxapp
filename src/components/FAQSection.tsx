import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: '¿Es legal comprar en WAXAPP?',
    a: 'Sí. Todos nuestros productos derivados de cáñamo y dispositivos operan bajo el marco legal actual y certificaciones sanitarias aplicables. Tu compra es 100% segura y facturable.',
  },
  {
    q: "¿Qué significa 'Efecto Séquito' o Full Spectrum?",
    a: 'Significa que conservamos todos los compuestos naturales de la planta trabajando en sinergia, lo que potencia los beneficios terapéuticos en comparación con los aislados.',
  },
  {
    q: '¿Cómo es el empaque del envío?',
    a: 'Totalmente discreto. Utilizamos cajas de paquetería estándar sin logotipos, marcas, ni descripciones del contenido en el exterior para garantizar tu privacidad.',
  },
  {
    q: '¿Qué dosis debo tomar si soy principiante?',
    a: 'Nuestra tecnología Nano es potente. Recomendamos iniciar siempre con la dosis mínima (ej. 1 triángulo de chocolate o media gomita) y esperar de 15 a 30 minutos antes de incrementar.',
  },
];

const FAQSection = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-14 text-center"
        >
          Preguntas Frecuentes<span className="text-primary">.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-b border-[hsl(0_0%_20%)] px-2"
              >
                <AccordionTrigger className="text-foreground text-left hover:no-underline hover:text-primary transition-colors py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQS = [
  {
    id: 'faq-legal',
    q: '¿Es legal comprar en WAXAPP?',
    a: 'Sí. Todos nuestros productos derivados de cáñamo y dispositivos operan bajo el marco legal actual y certificaciones sanitarias aplicables. Tu compra es 100% segura y facturable.',
  },
  {
    id: 'faq-fullspectrum',
    q: "¿Qué significa 'Efecto Séquito' o Full Spectrum?",
    a: 'Significa que conservamos todos los compuestos naturales de la planta trabajando en sinergia, lo que potencia los beneficios terapéuticos en comparación con los aislados.',
  },
  {
    id: 'faq-envio',
    q: '¿Cómo es el empaque del envío?',
    a: 'Totalmente discreto. Utilizamos cajas de paquetería estándar sin logotipos, marcas, ni descripciones del contenido en el exterior para garantizar tu privacidad.',
  },
  {
    id: 'faq-dosis',
    q: '¿Qué dosis debo tomar si soy principiante?',
    a: 'Nuestra tecnología Nano es potente. Recomendamos iniciar siempre con la dosis mínima (ej. 1 triángulo de chocolate o media gomita) y esperar de 15 a 30 minutos antes de incrementar.',
  },
];

const FAQSection = () => {
  const [query, setQuery] = useState('');
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  // Open from URL hash (e.g. #faq-legal)
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace('#', '');
      if (FAQS.some((f) => f.id === hash)) {
        setOpenItem(hash);
        // Scroll into view shortly after render
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      } else if (hash === 'faq') {
        document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section id="faq" className="py-24 px-4 md:px-8 bg-background scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al Inicio
        </Link>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center"
        >
          Preguntas Frecuentes<span className="text-primary">.</span>
        </motion.h2>
        <p className="text-center text-muted-foreground mb-8">
          ¿Tienes dudas? Busca o navega por las más comunes.
        </p>

        <div className="relative mb-6 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pregunta…"
            className="pl-9 bg-card border-border"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No encontramos resultados para “{query}”.
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              value={openItem}
              onValueChange={(v) => setOpenItem(v)}
              className="space-y-2"
            >
              {filtered.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  id={faq.id}
                  value={faq.id}
                  className="border-b border-[hsl(0_0%_20%)] px-2 scroll-mt-24"
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
          )}
        </motion.div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al Inicio
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

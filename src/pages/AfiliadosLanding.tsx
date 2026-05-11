import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Wallet, BarChart3, ArrowRight, Sparkles, Link2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const benefits = [
  { icon: Award, title: '15% de comisión', desc: 'Sobre cada venta atribuida a tu link, sin tope mensual.' },
  { icon: Wallet, title: 'Pagos rápidos', desc: 'Cortes quincenales por transferencia SPEI o saldo en tienda.' },
  { icon: BarChart3, title: 'Panel propio', desc: 'Métricas en vivo: clics, conversiones y comisiones acumuladas.' },
];

const steps = [
  { n: '01', title: 'Regístrate', desc: 'Solicita tu cuenta de vendedor en menos de 2 minutos.' },
  { n: '02', title: 'Comparte tu link', desc: 'Recibes una URL única con tu código ?ref= para difundir donde quieras.' },
  { n: '03', title: 'Cobra tus comisiones', desc: 'Cada compra atribuida a tu link se acumula y se paga quincenal.' },
];

const faqs = [
  { q: '¿Cómo se rastrea una venta a mi link?', a: 'Cuando alguien entra a la tienda con tu link ?ref=tu_codigo, guardamos una cookie segura en su navegador. Si compra dentro de los siguientes 30 días, la comisión se atribuye a tu cuenta automáticamente.' },
  { q: '¿Cuánto duran los cookies de atribución?', a: 'Las cookies de afiliado tienen una vida de 30 días. Si el cliente compra dentro de ese periodo, recibes tu comisión aunque no use el link directo en esa visita.' },
  { q: '¿Cuándo y cómo se pagan las comisiones?', a: 'Hacemos cortes los días 15 y 30 de cada mes. Pagamos por transferencia SPEI o como saldo a favor en la tienda, lo que prefieras desde tu panel.' },
  { q: '¿Hay un mínimo para retirar?', a: 'Sí, $300 MXN acumulados. Por debajo de eso el saldo se acumula al siguiente corte.' },
  { q: '¿Puedo crear varios links?', a: 'Sí, puedes generar campañas separadas (Instagram, TikTok, blog, etc.) con sub-códigos para medir cuál convierte mejor.' },
];

const AfiliadosLanding = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(0,230,118,0.18), transparent 60%), radial-gradient(circle at 70% 60%, rgba(255,179,0,0.12), transparent 50%)' }} />
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs uppercase tracking-widest text-primary mb-6">
            <Sparkles className="h-3 w-3" /> Programa de afiliados WAXAPP
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="font-display text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Gana <span className="text-primary">15%</span> por cada venta
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} className="mt-5 text-lg text-muted-foreground">
            Únete al programa de vendedores WAXAPP, comparte tu link único y monetiza tu audiencia con la marca premium #1 de bio-tech en México.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/portal-vendedores/login">
              <Button size="lg" className="gap-2 text-base">
                Unirse al programa <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#faq">
              <Button size="lg" variant="outline" className="border-border">Ver preguntas frecuentes</Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-6 max-w-5xl">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center">Cómo funciona</h2>
          <p className="text-center text-muted-foreground mt-3 max-w-xl mx-auto">Tres pasos para empezar a generar ingresos pasivos.</p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card p-6">
                <span className="font-mono text-3xl font-bold" style={{ color: '#00E676' }}>{s.n}</span>
                <h3 className="font-display text-lg font-semibold text-foreground mt-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center flex items-center justify-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Cómo funcionan los links ?ref
          </h2>
          <p className="text-center text-muted-foreground mt-3">Todo lo que necesitas saber para ganar comisiones.</p>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-foreground hover:text-primary">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Listo para ganar con WAXAPP?</h2>
          <p className="text-muted-foreground mt-4">Activa tu cuenta hoy y empieza a compartir tu link en minutos.</p>
          <Link to="/portal-vendedores/login" className="inline-block mt-8">
            <Button size="lg" className="gap-2 text-base">
              Crear cuenta de vendedor <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AfiliadosLanding;

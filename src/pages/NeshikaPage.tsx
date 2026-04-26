import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import neshikaLogo from '@/assets/neshika-logo.png';
import { Sparkles, Leaf, Award, ShieldCheck } from 'lucide-react';

const NeshikaPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00E676]/10 via-transparent to-transparent" />
      <div className="container relative mx-auto px-4 py-24 text-center">
        <img src={neshikaLogo} alt="Neshika" className="h-48 md:h-64 mx-auto drop-shadow-[0_0_40px_rgba(0,230,118,0.3)]" />
        <div className="inline-flex items-center gap-2 mt-6 mb-3 px-3 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-semibold">
          <Sparkles className="h-3 w-3" /> MARCA INSIGNIA WAXAPP
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight">Neshika</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Cannabis premium con identidad propia. Diseño elegante, calidad excepcional y nano tecnología propietaria.
        </p>
      </div>
    </section>

    {/* Pillars */}
    <section className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {[
          { icon: Leaf, title: 'Origen único', desc: 'Cepas seleccionadas y cultivadas con estándares premium.' },
          { icon: Award, title: 'Diseño insignia', desc: 'Identidad visual exclusiva, dorada y turquesa, inspirada en lujo tech.' },
          { icon: ShieldCheck, title: 'Calidad garantizada', desc: 'Cada lote pasa por análisis de laboratorio certificados.' },
        ].map((p) => (
          <article key={p.title} className="rounded-xl border border-border bg-card p-6 text-center hover:border-[#00E676]/40 transition-all">
            <div className="inline-flex rounded-lg bg-[#00E676]/10 p-3 mb-3"><p.icon className="h-6 w-6 text-[#00E676]" /></div>
            <h3 className="font-display text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
          </article>
        ))}
      </div>
    </section>

    {/* Story */}
    <section className="container mx-auto px-4 py-16 max-w-3xl">
      <h2 className="font-display text-3xl font-bold text-center mb-6">Nuestra historia</h2>
      <p className="text-muted-foreground leading-relaxed text-center">
        Neshika nació de la necesidad de ofrecer una marca mexicana que no comprometiera ni en estética ni en calidad.
        Combinamos décadas de experiencia en cultivo con la nano tecnología de WAXAPP para crear productos
        con biodisponibilidad superior y una experiencia premium del primer al último uso.
      </p>
    </section>

    <Footer />
  </div>
);

export default NeshikaPage;

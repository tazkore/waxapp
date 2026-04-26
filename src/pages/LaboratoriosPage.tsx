import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FlaskConical, Award } from 'lucide-react';

const labs = [
  { name: 'Ace Ultra Premium', desc: 'Cartuchos de alta concentración con destilados puros.', country: 'USA' },
  { name: 'Muha Meds', desc: 'Vapes premium con saborizantes naturales y hardware confiable.', country: 'USA' },
  { name: 'Fryd Extracts', desc: 'Líquidos diamantina líderes en el segmento gourmet.', country: 'USA' },
  { name: 'Kik Kalibloom', desc: 'Innovación en formulaciones de cannabinoides legales.', country: 'USA' },
  { name: 'Neshika Lab', desc: 'Nuestro laboratorio interno con nano tecnología propietaria.', country: 'México' },
];

const LaboratoriosPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-16">
      <header className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Nuestros Laboratorios</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Trabajamos solo con laboratorios certificados y proveedores con trazabilidad completa.
        </p>
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {labs.map((l) => (
          <article key={l.name} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2"><FlaskConical className="h-5 w-5 text-primary" /></div>
              <h2 className="font-display text-lg font-semibold">{l.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{l.desc}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Origen: {l.country}
            </div>
          </article>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default LaboratoriosPage;

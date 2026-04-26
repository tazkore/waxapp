import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

const labs = [
  { name: 'Ace Ultra', tag: 'Cartuchos premium' },
  { name: 'Muha Meds', tag: 'Vapes confiables' },
  { name: 'Fryd', tag: 'Líquidos gourmet' },
  { name: 'Kik Kalibloom', tag: 'Formulaciones legales' },
  { name: 'Neshika Lab', tag: 'Nano tecnología MX' },
];

const LaboratoriosSection = () => (
  <section id="laboratorios" className="py-20 border-t border-border">
    <div className="container mx-auto px-4">
      <header className="text-center mb-10">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Nuestros Laboratorios</h2>
        <p className="mt-2 text-muted-foreground">Proveedores certificados con trazabilidad completa.</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {labs.map((l) => (
          <article key={l.name} className="rounded-xl border border-border bg-card p-5 text-center hover:border-primary/40 transition-colors">
            <FlaskConical className="h-7 w-7 mx-auto text-primary mb-2" />
            <h3 className="font-semibold text-sm">{l.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{l.tag}</p>
          </article>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link to="/laboratorios" className="text-sm text-primary hover:underline">Ver detalle de laboratorios →</Link>
      </div>
    </div>
  </section>
);

export default LaboratoriosSection;

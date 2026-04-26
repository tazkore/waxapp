import { Link } from 'react-router-dom';
import neshikaLogo from '@/assets/neshika-logo.png';
import { Sparkles } from 'lucide-react';

const NeshikaFeatured = () => (
  <section className="py-20 border-t border-border">
    <div className="container mx-auto px-4">
      <Link to="/neshika"
        className="block max-w-4xl mx-auto rounded-2xl border-2 border-[#00E676]/40 bg-gradient-to-br from-card to-[#00E676]/5 p-10 transition-all hover:border-[#00E676] hover:shadow-[0_0_50px_rgba(0,230,118,0.25)]">
        <div className="grid md:grid-cols-2 items-center gap-8">
          <img src={neshikaLogo} alt="Neshika" className="h-48 md:h-56 mx-auto drop-shadow-[0_0_30px_rgba(0,230,118,0.25)]" />
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-semibold">
              <Sparkles className="h-3 w-3" /> MARCA INSIGNIA
            </div>
            <h2 className="font-display text-4xl font-bold">Neshika</h2>
            <p className="mt-3 text-muted-foreground">
              Nuestra marca insignia. Cannabis premium mexicano con nano tecnología propietaria, diseño elegante y calidad excepcional.
            </p>
            <span className="mt-4 inline-block text-[#00E676] font-medium">Descubre Neshika →</span>
          </div>
        </div>
      </Link>
    </div>
  </section>
);

export default NeshikaFeatured;

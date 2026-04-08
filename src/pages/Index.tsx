import { useState } from 'react';
import AgeGate from '@/components/AgeGate';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import TrustSignals from '@/components/TrustSignals';
import ProductGrid from '@/components/ProductGrid';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import NanoTechSection from '@/components/NanoTechSection';
import LegalSection from '@/components/LegalSection';
import FAQSection from '@/components/FAQSection';

const Index = () => {
  const [verified, setVerified] = useState(false);

  if (!verified) {
    return <AgeGate onAccept={() => setVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <HeroSection />
      <TrustSignals />
      <ProductGrid />
      <NanoTechSection />
      <LegalSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;

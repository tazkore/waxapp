import { useState } from 'react';
import AgeGate from '@/components/AgeGate';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import TrustSignals from '@/components/TrustSignals';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import ProductGrid from '@/components/ProductGrid';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import NanoTechSection from '@/components/NanoTechSection';
import LegalSection from '@/components/LegalSection';
import FAQSection from '@/components/FAQSection';
import WelcomeBanner from '@/components/WelcomeBanner';
import ChatbotWidget from '@/components/ChatbotWidget';
import BrandShowcase from '@/components/BrandShowcase';
import PromoBanners from '@/components/PromoBanners';
import BrandsStrip from '@/components/BrandsStrip';

const Index = () => {
  const [verified, setVerified] = useState(false);

  if (!verified) {
    return <AgeGate onAccept={() => setVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <WelcomeBanner />
      <Navbar />
      <CartDrawer />
      <HeroSection />
      <TrustSignals />
      <PromoBanners />
      <BrandsStrip />
      <FeaturedCarousel />
      <BrandShowcase />
      <ProductGrid />
      <NanoTechSection />
      <LegalSection />
      <FAQSection />
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Index;

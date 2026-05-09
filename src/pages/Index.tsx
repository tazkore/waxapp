import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import TrustSignals from '@/components/TrustSignals';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import ProductGrid from '@/components/ProductGrid';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import NanoTechSection from '@/components/NanoTechSection';
import FAQSection from '@/components/FAQSection';
import LegalSection from '@/components/LegalSection';
import WelcomeBanner from '@/components/WelcomeBanner';
import ChatbotWidget from '@/components/ChatbotWidget';
import BrandShowcase from '@/components/BrandShowcase';
import PromoBanners from '@/components/PromoBanners';
import BrandsStrip from '@/components/BrandsStrip';
import LaboratoriosSection from '@/components/LaboratoriosSection';
import NeshikaFeatured from '@/components/NeshikaFeatured';

const Index = () => {
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
      <LaboratoriosSection />
      <NeshikaFeatured />
      <NanoTechSection />
      <LegalSection />
      <FAQSection />
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Index;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import AdminSidebar from '@/components/admin/AdminSidebar';
import OverviewSection from '@/components/admin/OverviewSection';
import InventorySection from '@/components/admin/InventorySection';
import OrdersSection from '@/components/admin/OrdersSection';
import ClientsSection from '@/components/admin/ClientsSection';
import MarketingSection from '@/components/admin/MarketingSection';
import SettingsSection from '@/components/admin/SettingsSection';
import IntegrationsSection from '@/components/admin/IntegrationsSection';
import OperationsSection from '@/components/admin/OperationsSection';
import SeoSection from '@/components/admin/SeoSection';
import PurchasingSection from '@/components/admin/PurchasingSection';
import WarehousesSection from '@/components/admin/WarehousesSection';
import ShippingSection from '@/components/admin/ShippingSection';
import AmazonSection from '@/components/admin/AmazonSection';
import KnowledgeBaseSection from '@/components/admin/KnowledgeBaseSection';
import MediaSection from '@/components/admin/MediaSection';
import BrandsSection from '@/components/admin/BrandsSection';
import BannersSection from '@/components/admin/BannersSection';
import BlogSection from '@/components/admin/BlogSection';
import ThemeSection from '@/components/admin/ThemeSection';
import PaymentsSection from '@/components/admin/PaymentsSection';
import ApiKeysSection from '@/components/admin/ApiKeysSection';
import EnvironmentConnectionsSection from '@/components/admin/EnvironmentConnectionsSection';
import StaffSection from '@/components/admin/StaffSection';
import AccessAuditSection from '@/components/admin/AccessAuditSection';
import OnboardingWizard from '@/components/admin/OnboardingWizard';
import SiteImporterSection from '@/components/admin/SiteImporterSection';
import ImportedProductsPreviewSection from '@/components/admin/ImportedProductsPreviewSection';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useEffect } from 'react';

const Admin = () => {
  const [active, setActive] = useState('overview');
  const { role, loading, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { needsOnboarding, dismiss } = useOnboardingStatus();
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin && needsOnboarding) setWizardOpen(true);
  }, [loading, isAdmin, needsOnboarding]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = () => {
    switch (active) {
      case 'overview': return <OverviewSection onNavigate={setActive} />;
      case 'inventory': return <InventorySection isAdmin={isAdmin} />;
      case 'orders': return <OrdersSection />;
      case 'warehouses': return <WarehousesSection />;
      case 'shipping': return <ShippingSection />;
      case 'clients': return <ClientsSection />;
      case 'marketing': return <MarketingSection />;
      case 'payments': return <PaymentsSection />;
      case 'media': return <MediaSection />;
      case 'brands': return <BrandsSection />;
      case 'banners': return <BannersSection />;
      case 'blog': return <BlogSection />;
      case 'operations': return <OperationsSection />;
      case 'purchasing': return <PurchasingSection />;
      case 'seo': return <SeoSection />;
      case 'theme': return <ThemeSection />;
      case 'amazon': return isAdmin ? <AmazonSection /> : <OverviewSection onNavigate={setActive} />;
      case 'chatbot': return isAdmin ? <KnowledgeBaseSection /> : <OverviewSection onNavigate={setActive} />;
      case 'integrations': return isAdmin ? <IntegrationsSection /> : <OverviewSection onNavigate={setActive} />;
      case 'api-keys': return isAdmin ? <ApiKeysSection /> : <OverviewSection onNavigate={setActive} />;
      case 'env-connections': return isAdmin ? <EnvironmentConnectionsSection /> : <OverviewSection onNavigate={setActive} />;
      case 'staff': return isAdmin ? <StaffSection /> : <OverviewSection onNavigate={setActive} />;
      case 'access-audit': return isAdmin ? <AccessAuditSection /> : <OverviewSection onNavigate={setActive} />;
      case 'setup': return isAdmin ? <div className="text-center py-12"><Button onClick={() => setWizardOpen(true)}>Abrir Setup Inicial</Button></div> : <OverviewSection onNavigate={setActive} />;
      case 'importer': return isAdmin ? <SiteImporterSection /> : <OverviewSection onNavigate={setActive} />;
      case 'imported-preview': return isAdmin ? <ImportedProductsPreviewSection /> : <OverviewSection onNavigate={setActive} />;
      case 'settings': return isAdmin ? <SettingsSection /> : <OverviewSection onNavigate={setActive} />;
      default: return <OverviewSection onNavigate={setActive} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeSection={active} onNavigate={setActive} showSettings={isAdmin} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              WAXAPP<span className="text-primary">.</span> Admin Panel
            </span>
            <Badge variant="outline" className="ml-2 text-xs capitalize border-primary/30 text-primary">
              {role}
            </Badge>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {renderSection()}
          </main>
        </div>
      </div>
      <OnboardingWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); dismiss(); }}
        onJumpToImporter={() => setActive('importer')}
      />
    </SidebarProvider>
  );
};

export default Admin;

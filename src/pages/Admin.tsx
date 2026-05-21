import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Loader2, ChevronRight } from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  overview: 'Dashboard',
  orders: 'Pedidos',
  shipping: 'Envíos',
  clients: 'Clientes',
  affiliates: 'Afiliados',
  payments: 'Pagos',
  'payment-gateways': 'Pasarelas de Pago',
  purchasing: 'Compras B2B',
  operations: 'Operaciones',
  products: 'Productos',
  inventory: 'Inventario',
  warehouses: 'Almacenes',
  brands: 'Marcas',
  media: 'Multimedia',
  banners: 'Banners',
  blog: 'Blog',
  channels: 'Canales de Venta',
  amazon: 'Amazon Seller',
  marketing: 'Hub Marketing',
  'marketing-coupons': 'Cupones & Descuentos',
  seo: 'SEO & Indexación',
  apps: 'Aplicaciones',
  integrations: 'Integraciones',
  chatbot: 'Chatbot IA',
  theme: 'Tema',
  domains: 'Dominios',
  'domains-overview': 'Resumen Dominios',
  staff: 'Staff & Usuarios',
  'api-keys': 'API Keys',
  'env-connections': 'Conexiones de Entorno',
  'access-audit': 'Auditoría de Acceso',
  setup: 'Setup Inicial',
  importer: 'Importar Sitio',
  'imported-preview': 'Preview Importados',
  'theme-importer': 'Importar Tema IA',
  settings: 'Configuración',
  whatsapp: 'WhatsApp CRM (Kapso)',
};
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import AdminSidebar from '@/components/admin/AdminSidebar';
import OverviewSection from '@/components/admin/OverviewSection';
import InventorySection from '@/components/admin/InventorySection';
import ProductsSection from '@/components/admin/ProductsSection';
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
import ThemeImporterSection from '@/components/admin/ThemeImporterSection';
import DomainsSection from '@/components/admin/DomainsSection';
import DomainsOverviewSection from '@/components/admin/DomainsOverviewSection';
import AppsSection from '@/components/admin/AppsSection';
import ChannelsSection from '@/components/admin/ChannelsSection';
import SubStoreAdminPanel from '@/components/admin/SubStoreAdminPanel';
import AffiliatesSection from '@/components/admin/AffiliatesSection';
import InstalledAppView from '@/components/admin/InstalledAppView';
import WhatsAppCRMSection from '@/components/admin/WhatsAppCRMSection';
import Copyright from '@/components/Copyright';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useEffect } from 'react';

const Admin = () => {
  const [active, setActive] = useState('overview');
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
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
      case 'products': return <ProductsSection />;
      case 'inventory': return <InventorySection isAdmin={isAdmin} />;
      case 'orders': return <OrdersSection />;
      case 'warehouses': return <WarehousesSection />;
      case 'shipping': return <ShippingSection />;
      case 'clients': return <ClientsSection />;
      case 'affiliates': return isAdmin ? <AffiliatesSection /> : <OverviewSection onNavigate={setActive} />;
      case 'marketing': return <MarketingSection />;
      case 'payments': return <PaymentsSection />;
      case 'payment-gateways': return <PaymentsSection />;
      case 'marketing-coupons': return <MarketingSection />;
      case 'apps': return isAdmin ? <AppsSection /> : <OverviewSection onNavigate={setActive} />;
      case 'channels': return <ChannelsSection onNavigate={setActive} />;
      case 'media': return <MediaSection />;
      case 'brands': return <BrandsSection />;
      case 'domains': return isAdmin ? <DomainsSection /> : <OverviewSection onNavigate={setActive} />;
      case 'domains-overview': return isAdmin ? <DomainsOverviewSection /> : <OverviewSection onNavigate={setActive} />;
      case 'banners': return <BannersSection />;
      case 'blog': return <BlogSection />;
      case 'operations': return <OperationsSection />;
      case 'purchasing': return <PurchasingSection />;
      case 'seo': return <SeoSection />;
      case 'theme': return <ThemeSection />;
      case 'theme-builder': { navigate('/admin/theme-builder'); return null; }
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
      case 'theme-importer': return isAdmin ? <ThemeImporterSection /> : <OverviewSection onNavigate={setActive} />;
      case 'settings': return isAdmin ? <SettingsSection /> : <OverviewSection onNavigate={setActive} />;
      case 'whatsapp': return <WhatsAppCRMSection />;
      default:
        // Dynamic app routes: app-{slug}
        if (active.startsWith('app-')) {
          const slug = active.replace('app-', '');
          return <InstalledAppView slug={slug} />;
        }
        return <OverviewSection onNavigate={setActive} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeSection={active}
          onNavigate={setActive}
          showSettings={isAdmin && !activeStoreId}
          activeStoreId={activeStoreId}
          onSelectStore={setActiveStoreId}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-2 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-muted-foreground/60 font-medium hidden sm:block">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block" />
              <span className="text-foreground font-medium truncate">
                {activeStoreId ? 'Sub-tienda' : (SECTION_LABELS[active] ?? 'Dashboard')}
              </span>
            </div>
            <Badge variant="outline" className="ml-1 text-xs capitalize border-primary/30 text-primary hidden sm:inline-flex">
              {role}
            </Badge>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {activeStoreId ? <SubStoreAdminPanel subStoreId={activeStoreId} isAdmin={isAdmin} /> : renderSection()}
            {!activeStoreId && <Copyright className="mt-8 pt-6 border-t border-border" />}
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

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

const Admin = () => {
  const [active, setActive] = useState('overview');
  const { role, loading, isAdmin } = useUserRole();
  const navigate = useNavigate();

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

  const sections: Record<string, React.FC<{ isAdmin?: boolean }>> = {
    overview: OverviewSection,
    inventory: InventorySection,
    orders: OrdersSection,
    clients: ClientsSection,
    marketing: MarketingSection,
    ...(isAdmin ? { settings: SettingsSection } : {}),
  };

  const ActiveComponent = sections[active] || OverviewSection;

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
            <ActiveComponent isAdmin={isAdmin} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;

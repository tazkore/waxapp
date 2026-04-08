import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import OverviewSection from '@/components/admin/OverviewSection';
import InventorySection from '@/components/admin/InventorySection';
import OrdersSection from '@/components/admin/OrdersSection';
import ClientsSection from '@/components/admin/ClientsSection';
import SettingsSection from '@/components/admin/SettingsSection';

const sections: Record<string, React.FC> = {
  overview: OverviewSection,
  inventory: InventorySection,
  orders: OrdersSection,
  clients: ClientsSection,
  settings: SettingsSection,
};

const Admin = () => {
  const [active, setActive] = useState('overview');
  const ActiveComponent = sections[active];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeSection={active} onNavigate={setActive} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              WAXAPP<span className="text-primary">.</span> Admin Panel
            </span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <ActiveComponent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;

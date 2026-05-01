import { BarChart3, Package, Truck, Users, Settings, Tag, Puzzle, ClipboardList, Rocket, ShoppingCart, Warehouse, PackageCheck, ShoppingBag, Brain, Image as ImageIcon, Bookmark, Megaphone, Newspaper, Palette, CreditCard, KeyRound, Network, UserCog, Shield, Sparkles, Wand2, Eye, Globe, Store, ChevronDown, Boxes } from 'lucide-react';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useAccessibleSubStores } from '@/hooks/useAccessibleSubStores';
import Copyright from '@/components/Copyright';

const allNavItems = [
  { title: 'Vista General', icon: BarChart3, key: 'overview' },
  { title: 'Inventario', icon: Package, key: 'inventory' },
  { title: 'Pedidos y Envíos', icon: Truck, key: 'orders' },
  { title: 'Almacenes', icon: Warehouse, key: 'warehouses' },
  { title: 'Guías de Envío', icon: PackageCheck, key: 'shipping' },
  { title: 'Clientes y CRM', icon: Users, key: 'clients' },
  { title: 'Marketing', icon: Tag, key: 'marketing' },
  { title: 'Pagos', icon: CreditCard, key: 'payments' },
  { title: 'Multimedia', icon: ImageIcon, key: 'media' },
 { title: 'Dominios', icon: Globe, key: 'domains', adminOnly: true },
 { title: 'Marcas', icon: Bookmark, key: 'brands' },
  { title: 'Banners Home', icon: Megaphone, key: 'banners' },
  { title: 'Blog', icon: Newspaper, key: 'blog' },
  { title: 'Centro de Operaciones', icon: ClipboardList, key: 'operations' },
  { title: 'Compras & Corporativo', icon: ShoppingCart, key: 'purchasing' },
  { title: 'SEO & Indexación', icon: Rocket, key: 'seo' },
  { title: 'Tema', icon: Palette, key: 'theme' },
  { title: 'Amazon Seller', icon: ShoppingBag, key: 'amazon', adminOnly: true },
  { title: 'Chatbot IA', icon: Brain, key: 'chatbot', adminOnly: true },
  { title: 'Integraciones', icon: Puzzle, key: 'integrations', adminOnly: true },
    { title: 'Setup Inicial', icon: Sparkles, key: 'setup', adminOnly: true },
    { title: 'Importar Sitio', icon: Wand2, key: 'importer', adminOnly: true },
    { title: 'Previsualizar Importados', icon: Eye, key: 'imported-preview', adminOnly: true },
    { title: 'Importar Tema (IA)', icon: Palette, key: 'theme-importer', adminOnly: true },
    { title: 'Staff & Usuarios', icon: UserCog, key: 'staff', adminOnly: true },
    { title: 'API & Conexiones', icon: KeyRound, key: 'api-keys', adminOnly: true },
    { title: 'Conexiones de Entorno', icon: Network, key: 'env-connections', adminOnly: true },
    { title: 'Auditoría de Acceso', icon: Shield, key: 'access-audit', adminOnly: true },
    { title: 'Configuración', icon: Settings, key: 'settings', adminOnly: true },
];

interface AdminSidebarProps {
  activeSection: string;
  onNavigate: (key: string) => void;
  showSettings?: boolean;
  activeStoreId?: string | null;
  onSelectStore?: (storeId: string | null) => void;
}

const AdminSidebar = ({ activeSection, onNavigate, showSettings = true, activeStoreId, onSelectStore }: AdminSidebarProps) => {
  const navItems = allNavItems.filter(item => !item.adminOnly || showSettings);
  const { stores, loading: storesLoading } = useAccessibleSubStores();
  const [storesOpen, setStoresOpen] = useState(true);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className="px-4 mb-8 group-data-[collapsible=icon]:hidden">
          <span className="text-xl font-bold text-foreground tracking-tight">
            WAXAPP<span className="text-primary">.</span>
          </span>
          <span className="text-xs text-muted-foreground ml-2">Admin</span>
        </div>

        {stores.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer" onClick={() => setStoresOpen(!storesOpen)}>
              <span className="flex items-center gap-2"><Store className="h-3 w-3" />Tiendas</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${storesOpen ? '' : '-rotate-90'}`} />
            </SidebarGroupLabel>
            {storesOpen && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {storesLoading && <SidebarMenuItem><div className="px-3 py-1 text-xs text-muted-foreground">Cargando…</div></SidebarMenuItem>}
                  {stores.map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectStore?.(s.id)}
                        className={`cursor-pointer ${activeStoreId === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                      >
                        <Store className="h-4 w-4" />
                        <span className="truncate">{s.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        <SidebarGroup>
          {showSettings && stores.length > 0 && <SidebarGroupLabel>Tienda principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => { onSelectStore?.(null); onNavigate(item.key); }}
                    className={`cursor-pointer ${
                      !activeStoreId && activeSection === item.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto px-3 py-3 group-data-[collapsible=icon]:hidden">
          <Copyright className="text-[10px]" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;

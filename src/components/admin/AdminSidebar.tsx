import { BarChart3, Package, Truck, Users, Settings, Tag, Puzzle, ClipboardList, Rocket, ShoppingCart, Warehouse, PackageCheck, ShoppingBag, Brain, Image as ImageIcon, Bookmark, Megaphone, Newspaper, Palette, CreditCard, KeyRound, Network, UserCog } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

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
    { title: 'Staff & Usuarios', icon: UserCog, key: 'staff', adminOnly: true },
    { title: 'API & Conexiones', icon: KeyRound, key: 'api-keys', adminOnly: true },
    { title: 'Conexiones de Entorno', icon: Network, key: 'env-connections', adminOnly: true },
    { title: 'Configuración', icon: Settings, key: 'settings', adminOnly: true },
];

interface AdminSidebarProps {
  activeSection: string;
  onNavigate: (key: string) => void;
  showSettings?: boolean;
}

const AdminSidebar = ({ activeSection, onNavigate, showSettings = true }: AdminSidebarProps) => {
  const navItems = allNavItems.filter(item => !item.adminOnly || showSettings);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className="px-4 mb-8 group-data-[collapsible=icon]:hidden">
          <span className="text-xl font-bold text-foreground tracking-tight">
            WAXAPP<span className="text-primary">.</span>
          </span>
          <span className="text-xs text-muted-foreground ml-2">Admin</span>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => onNavigate(item.key)}
                    className={`cursor-pointer ${
                      activeSection === item.key
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
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;

import {
  BarChart3, Package, Truck, Users, Settings, Tag, Puzzle, ClipboardList, Rocket,
  ShoppingCart, Warehouse, PackageCheck, ShoppingBag, Brain, Image as ImageIcon,
  Bookmark, Megaphone, Newspaper, Palette, CreditCard, KeyRound, Network, UserCog,
  Shield, Sparkles, Wand2, Eye, Globe, Store, ChevronDown, Boxes, Home, LineChart,
  Wallet, Layers, Radio, Megaphone as MegaIcon, AppWindow, Languages, Link2, ListChecks,
} from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { useAccessibleSubStores } from '@/hooks/useAccessibleSubStores';
import Copyright from '@/components/Copyright';

type NavItem = { title: string; icon: any; key: string; adminOnly?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[]; adminOnly?: boolean };

const groups: NavGroup[] = [
  {
    id: 'main', label: 'Principal',
    items: [
      { title: 'Inicio', icon: Home, key: 'overview' },
      { title: 'Estadísticas', icon: LineChart, key: 'overview' },
    ],
  },
  {
    id: 'manage', label: 'Gestión',
    items: [
      { title: 'Pedidos', icon: ClipboardList, key: 'orders' },
      { title: 'Envíos & Paqueterías', icon: Truck, key: 'shipping' },
      { title: 'Clientes & CRM', icon: Users, key: 'clients' },
      { title: 'Afiliados / Vendedores', icon: Users, key: 'affiliates', adminOnly: true },
      { title: 'Pagos', icon: CreditCard, key: 'payments' },
      { title: 'Pasarelas de Pago', icon: Wallet, key: 'payment-gateways' },
      { title: 'Compras & B2B', icon: ShoppingCart, key: 'purchasing' },
      { title: 'Centro de Operaciones', icon: PackageCheck, key: 'operations' },
    ],
  },
  {
    id: 'catalog', label: 'Catálogo',
    items: [
      { title: 'Productos', icon: Boxes, key: 'products' },
      { title: 'Inventario', icon: Package, key: 'inventory' },
      { title: 'Almacenes', icon: Warehouse, key: 'warehouses' },
      { title: 'Marcas', icon: Bookmark, key: 'brands' },
      { title: 'Multimedia', icon: ImageIcon, key: 'media' },
      { title: 'Banners Home', icon: Megaphone, key: 'banners' },
      { title: 'Blog', icon: Newspaper, key: 'blog' },
    ],
  },
  {
    id: 'channels', label: 'Canales de venta',
    items: [
      { title: 'Canales', icon: Radio, key: 'channels' },
      { title: 'Amazon Seller', icon: ShoppingBag, key: 'amazon', adminOnly: true },
    ],
  },
  {
    id: 'boost', label: 'Potenciar',
    items: [
      { title: 'Hub Marketing', icon: MegaIcon, key: 'marketing' },
      { title: 'Marketing & Cupones', icon: Tag, key: 'marketing-coupons' },
      { title: 'SEO & Indexación', icon: Rocket, key: 'seo' },
    ],
  },
  {
    id: 'apps', label: 'Apps & Integraciones', adminOnly: true,
    items: [
      { title: 'Aplicaciones', icon: AppWindow, key: 'apps', adminOnly: true },
      { title: 'Integraciones', icon: Puzzle, key: 'integrations', adminOnly: true },
      { title: 'Chatbot IA', icon: Brain, key: 'chatbot', adminOnly: true },
    ],
  },
  {
    id: 'config', label: 'Configuración', adminOnly: true,
    items: [
      { title: 'Tema', icon: Palette, key: 'theme' },
      { title: 'Dominios', icon: Globe, key: 'domains', adminOnly: true },
      { title: 'Staff & Usuarios', icon: UserCog, key: 'staff', adminOnly: true },
      { title: 'API & Conexiones', icon: KeyRound, key: 'api-keys', adminOnly: true },
      { title: 'Conexiones de Entorno', icon: Network, key: 'env-connections', adminOnly: true },
      { title: 'Auditoría de Acceso', icon: Shield, key: 'access-audit', adminOnly: true },
      { title: 'Setup Inicial', icon: Sparkles, key: 'setup', adminOnly: true },
      { title: 'Importar Sitio', icon: Wand2, key: 'importer', adminOnly: true },
      { title: 'Previsualizar Importados', icon: Eye, key: 'imported-preview', adminOnly: true },
      { title: 'Importar Tema (IA)', icon: Layers, key: 'theme-importer', adminOnly: true },
      { title: 'Configuración general', icon: Settings, key: 'settings', adminOnly: true },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onNavigate: (key: string) => void;
  showSettings?: boolean;
  activeStoreId?: string | null;
  onSelectStore?: (storeId: string | null) => void;
}

const AdminSidebar = ({ activeSection, onNavigate, showSettings = true, activeStoreId, onSelectStore }: AdminSidebarProps) => {
  const { stores, loading: storesLoading } = useAccessibleSubStores();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.id, true]))
  );
  const [storesOpen, setStoresOpen] = useState(true);

  const toggle = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const visibleGroups = groups
    .filter((g) => !g.adminOnly || showSettings)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || showSettings) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className="px-4 mb-6 group-data-[collapsible=icon]:hidden">
          <span className="text-xl font-bold text-foreground tracking-tight">
            WAXAPP<span className="text-primary">.</span>
          </span>
          <span className="text-xs text-muted-foreground ml-2">Admin</span>
        </div>

        {stores.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setStoresOpen(!storesOpen)}
            >
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

        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.id];
          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel
                className="flex items-center justify-between cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggle(group.id)}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold">{group.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
              {isOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={`${group.id}-${item.key}-${item.title}`}>
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
              )}
            </SidebarGroup>
          );
        })}

        <div className="mt-auto px-3 py-3 group-data-[collapsible=icon]:hidden">
          <Copyright className="text-[10px]" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;

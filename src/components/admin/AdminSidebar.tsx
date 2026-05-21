import {
  Package, Truck, Users, Settings, Tag, Puzzle, ClipboardList, Rocket,
  ShoppingCart, Warehouse, PackageCheck, ShoppingBag, Brain, Image as ImageIcon,
  Bookmark, Megaphone, Newspaper, Palette, CreditCard, KeyRound, Network, UserCog,
  Shield, Sparkles, Wand2, Eye, Globe, Store, ChevronDown, Boxes,
  Wallet, Layers, Radio, AppWindow, Link2, LayoutDashboard, MessageCircle,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAccessibleSubStores } from '@/hooks/useAccessibleSubStores';
import { useInstalledApps } from '@/hooks/useInstalledApps';
import { Package2 } from 'lucide-react';
import Copyright from '@/components/Copyright';

type NavItem = { title: string; icon: any; key: string; adminOnly?: boolean };
type NavGroup = {
  id: string;
  label: string;
  color: string;
  items: NavItem[];
  adminOnly?: boolean;
  startClosed?: boolean;
};

const groups: NavGroup[] = [
  {
    id: 'main', label: 'Principal', color: '#00e56f',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, key: 'overview' },
    ],
  },
  {
    id: 'manage', label: 'Gestión', color: '#f59e0b',
    items: [
      { title: 'Pedidos', icon: ClipboardList, key: 'orders' },
      { title: 'Envíos', icon: Truck, key: 'shipping' },
      { title: 'Clientes', icon: Users, key: 'clients' },
      { title: 'Afiliados', icon: Link2, key: 'affiliates', adminOnly: true },
      { title: 'Pagos', icon: CreditCard, key: 'payments' },
      { title: 'Pasarelas de Pago', icon: Wallet, key: 'payment-gateways' },
      { title: 'Compras B2B', icon: ShoppingCart, key: 'purchasing' },
      { title: 'Operaciones', icon: PackageCheck, key: 'operations' },
    ],
  },
  {
    id: 'catalog', label: 'Catálogo', color: '#60a5fa',
    items: [
      { title: 'Productos', icon: Boxes, key: 'products' },
      { title: 'Inventario', icon: Package, key: 'inventory' },
      { title: 'Almacenes', icon: Warehouse, key: 'warehouses' },
      { title: 'Marcas', icon: Bookmark, key: 'brands' },
      { title: 'Multimedia', icon: ImageIcon, key: 'media' },
      { title: 'Banners', icon: Megaphone, key: 'banners' },
      { title: 'Blog', icon: Newspaper, key: 'blog' },
    ],
  },
  {
    id: 'channels', label: 'Canales', color: '#a78bfa',
    items: [
      { title: 'Canales de Venta', icon: Radio, key: 'channels' },
      { title: 'Amazon Seller', icon: ShoppingBag, key: 'amazon', adminOnly: true },
    ],
  },
  {
    id: 'boost', label: 'Marketing', color: '#f472b6',
    items: [
      { title: 'Hub Marketing', icon: Megaphone, key: 'marketing' },
      { title: 'Cupones & Descuentos', icon: Tag, key: 'marketing-coupons' },
      { title: 'SEO & Indexación', icon: Rocket, key: 'seo' },
      { title: 'WhatsApp CRM (Kapso)', icon: MessageCircle, key: 'whatsapp' },
    ],
  },
  {
    id: 'apps', label: 'Apps & IA', adminOnly: true, color: '#22d3ee',
    items: [
      { title: 'Aplicaciones', icon: AppWindow, key: 'apps', adminOnly: true },
      { title: 'Integraciones', icon: Puzzle, key: 'integrations', adminOnly: true },
      { title: 'Chatbot IA', icon: Brain, key: 'chatbot', adminOnly: true },
    ],
  },
  {
    id: 'config', label: 'Configuración', adminOnly: true, color: '#94a3b8', startClosed: true,
    items: [
      { title: 'Tema', icon: Palette, key: 'theme' },
      { title: 'Theme Builder ✦', icon: Layers, key: 'theme-builder' },
      { title: 'Dominios', icon: Globe, key: 'domains', adminOnly: true },
      { title: 'Resumen Dominios', icon: Globe, key: 'domains-overview', adminOnly: true },
      { title: 'Staff & Usuarios', icon: UserCog, key: 'staff', adminOnly: true },
      { title: 'API Keys', icon: KeyRound, key: 'api-keys', adminOnly: true },
      { title: 'Conexiones', icon: Network, key: 'env-connections', adminOnly: true },
      { title: 'Auditoría', icon: Shield, key: 'access-audit', adminOnly: true },
      { title: 'Setup Inicial', icon: Sparkles, key: 'setup', adminOnly: true },
      { title: 'Importar Sitio', icon: Wand2, key: 'importer', adminOnly: true },
      { title: 'Preview Importados', icon: Eye, key: 'imported-preview', adminOnly: true },
      { title: 'Importar Tema IA', icon: Layers, key: 'theme-importer', adminOnly: true },
      { title: 'Configuración', icon: Settings, key: 'settings', adminOnly: true },
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

const AdminSidebar = ({
  activeSection,
  onNavigate,
  showSettings = true,
  activeStoreId,
  onSelectStore,
}: AdminSidebarProps) => {
  const { stores, loading: storesLoading } = useAccessibleSubStores();
  const { apps: installedApps } = useInstalledApps();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.id, !g.startClosed]))
  );
  const [storesOpen, setStoresOpen] = useState(false);

  const toggle = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const visibleGroups = groups
    .filter((g) => !g.adminOnly || showSettings)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || showSettings) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4 relative overflow-x-hidden">
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-primary/6 to-transparent pointer-events-none" />

        {/* Logo — expanded */}
        <div className="px-3.5 mb-4 relative group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 0 14px hsl(145 100% 45% / 0.45)' }}
            >
              <span className="text-sm font-black text-primary-foreground tracking-tighter select-none">W</span>
            </div>
            <div className="min-w-0 leading-none">
              <span className="block text-[13px] font-bold tracking-widest text-foreground uppercase">
                WAXAPP
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                Admin Panel
              </span>
            </div>
          </div>
        </div>

        {/* Logo — collapsed (icon only) */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center mb-4 px-2 relative">
          <div
            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"
            style={{ boxShadow: '0 0 14px hsl(145 100% 45% / 0.45)' }}
          >
            <span className="text-sm font-black text-primary-foreground select-none">W</span>
          </div>
        </div>

        {/* Stores */}
        {stores.length > 0 && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel
                className="flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
                onClick={() => setStoresOpen((v) => !v)}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-semibold flex-1">
                  <Store className="h-3 w-3" />
                  Tiendas
                </span>
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform duration-200 text-primary/60', !storesOpen && '-rotate-90')}
                />
              </SidebarGroupLabel>
              {/* Stores items: hidden in expanded when closed, always visible in icon mode */}
              <SidebarGroupContent
                className={cn(!storesOpen && 'group-data-[state=expanded]:hidden')}
              >
                <SidebarMenu>
                  {storesLoading && (
                    <SidebarMenuItem>
                      <div className="px-3 py-1 text-xs text-muted-foreground">Cargando…</div>
                    </SidebarMenuItem>
                  )}
                  {stores.map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        tooltip={s.name}
                        onClick={() => onSelectStore?.(s.id)}
                        className={cn(
                          'cursor-pointer transition-all duration-150 border-l-2',
                          activeStoreId === s.id
                            ? 'bg-primary/10 text-primary border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                        )}
                      >
                        <Store className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator className="my-1" />
          </>
        )}

        {/* Navigation groups */}
        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.id];
          return (
            <SidebarGroup key={group.id}>
              {/* Group label — hidden in icon mode */}
              <SidebarGroupLabel
                className="flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
                onClick={() => toggle(group.id)}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-[9px] uppercase tracking-widest font-semibold flex-1">
                  {group.label}
                </span>
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform duration-200', !isOpen && '-rotate-90')}
                  style={{ color: group.color, opacity: 0.6 }}
                />
              </SidebarGroupLabel>

              {/* Items: closed in expanded → hidden; collapsed (icon) → always visible */}
              <SidebarGroupContent
                className={cn(!isOpen && 'group-data-[state=expanded]:hidden')}
              >
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = !activeStoreId && activeSection === item.key;
                    return (
                      <SidebarMenuItem key={`${group.id}-${item.key}`}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          onClick={() => { onSelectStore?.(null); onNavigate(item.key); }}
                          className={cn(
                            'cursor-pointer transition-all duration-150 border-l-2',
                            isActive
                              ? 'bg-primary/10 text-primary border-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-4 w-4 flex-shrink-0 transition-colors',
                              isActive && 'text-primary'
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Installed apps — dynamic group */}
        {installedApps.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#10b981' }} />
              <span className="text-[9px] uppercase tracking-widest font-semibold flex-1">Apps Instaladas</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {installedApps.map((app) => {
                  const key = `app-${app.slug}`;
                  const isActive = !activeStoreId && activeSection === key;
                  return (
                    <SidebarMenuItem key={app.id}>
                      <SidebarMenuButton
                        tooltip={app.name}
                        onClick={() => { onSelectStore?.(null); onNavigate(key); }}
                        className={cn(
                          'cursor-pointer transition-all duration-150 border-l-2',
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400 font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                        )}
                      >
                        <Package2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{app.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Footer */}
        <div className="mt-auto px-3 pt-4 pb-3 group-data-[collapsible=icon]:hidden border-t border-border/40">
          <Copyright className="text-[10px] text-muted-foreground/40" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;

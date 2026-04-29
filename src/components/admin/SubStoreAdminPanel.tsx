import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExternalLink, Loader2, Package, ShoppingCart, Palette, Globe, Tag, Image as ImageIcon } from "lucide-react";
import { SubStoreProvider } from "@/contexts/SubStoreContext";
import InventorySection from "./InventorySection";
import OrdersSection from "./OrdersSection";
import MarketingSection from "./MarketingSection";
import BannersSection from "./BannersSection";
import MediaSection from "./MediaSection";
import DomainsSection from "./DomainsSection";
import Copyright from "@/components/Copyright";

interface Props {
  subStoreId: string;
  isAdmin: boolean;
}

const SubStoreAdminPanel = ({ subStoreId, isAdmin }: Props) => {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ products: 0, orders: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("sub_stores").select("*").eq("id", subStoreId).maybeSingle();
      setStore(data);
      const [{ count: pc }, { count: oc }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("sub_store_id", subStoreId),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ products: pc ?? 0, orders: oc ?? 0 });
      setLoading(false);
    })();
  }, [subStoreId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!store) {
    return <p className="text-sm text-muted-foreground">Tienda no encontrada o sin acceso.</p>;
  }

  return (
    <SubStoreProvider value={{ subStoreId, subStoreName: store.name, brandId: store.brand_id }}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            {store.logo_url && <img src={store.logo_url} alt={store.name} className="h-10 w-10 object-contain rounded bg-muted p-1" />}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{store.name}</h1>
              <p className="text-xs text-muted-foreground">Panel exclusivo de esta marca / sub-tienda</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">/{store.slug}</Badge>
          </div>
          <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" />Ver tienda</Button>
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Productos</p><p className="text-2xl font-bold text-primary">{counts.products}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pedidos</p><p className="text-2xl font-bold">{counts.orders}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Marca</p><p className="text-sm font-medium truncate">{store.brand_id ? "Asignada" : "—"}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Estado</p><p className="text-sm font-medium">{store.is_active ? "Activa" : "Pausada"}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="inventory" className="gap-1"><Package className="h-3 w-3" />Inventario</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="h-3 w-3" />Pedidos</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-1"><Tag className="h-3 w-3" />Marketing</TabsTrigger>
            <TabsTrigger value="banners" className="gap-1"><ImageIcon className="h-3 w-3" />Banners</TabsTrigger>
            <TabsTrigger value="media" className="gap-1"><ImageIcon className="h-3 w-3" />Multimedia</TabsTrigger>
            <TabsTrigger value="domains" className="gap-1"><Globe className="h-3 w-3" />Dominios</TabsTrigger>
            <TabsTrigger value="theme" className="gap-1"><Palette className="h-3 w-3" />Tema</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory"><InventorySection isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="orders"><OrdersSection /></TabsContent>
          <TabsContent value="marketing"><MarketingSection /></TabsContent>
          <TabsContent value="banners"><BannersSection /></TabsContent>
          <TabsContent value="media"><MediaSection /></TabsContent>
          <TabsContent value="domains"><DomainsSection /></TabsContent>
          <TabsContent value="theme">
            <Card>
              <CardHeader><CardTitle className="text-base">Tema de la sub-tienda</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>El tema (colores, fuentes, hero) se gestiona directamente sobre la sub-tienda <code>{store.slug}</code>.</p>
                <p className="text-muted-foreground text-xs">Para editar visualmente, usa la sección "Importar Tema (IA)" o el editor de marcas.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Copyright className="pt-6 border-t border-border" />
      </div>
    </SubStoreProvider>
  );
};

export default SubStoreAdminPanel;

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SubStore {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_headline: string | null;
  hero_subtitle: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  color_background: string | null;
  color_foreground: string | null;
  color_accent: string | null;
  font_heading: string | null;
  font_body: string | null;
  brand_id: string | null;
}

const SubStorePage = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<SubStore | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("sub_stores")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) { setNotFound(true); setLoading(false); return; }
      setStore(s as any);

      // Load products: those assigned to this sub-store OR to its brand
      let q = supabase.from("products").select("*").eq("is_active", true).limit(60);
      const { data: byStore } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("sub_store_id", s.id);
      let prods = byStore ?? [];
      if (prods.length === 0 && s.brand_id) {
        const { data: byBrand } = await q.eq("brand_id", s.brand_id);
        prods = byBrand ?? [];
      }
      setProducts(prods);
      setLoading(false);

      // Apply theme to CSS vars on this page only
      const root = document.documentElement;
      if (s.color_primary) root.style.setProperty("--primary", s.color_primary);
      if (s.color_secondary) root.style.setProperty("--secondary", s.color_secondary);
      if (s.color_background) root.style.setProperty("--background", s.color_background);
      if (s.color_foreground) root.style.setProperty("--foreground", s.color_foreground);
      if (s.color_accent) root.style.setProperty("--accent", s.color_accent);

      document.title = `${s.name}${s.tagline ? " — " + s.tagline : ""}`;
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <h1 className="text-2xl font-bold">Sub-tienda no encontrada</h1>
        <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Volver al inicio</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: store.font_body ?? undefined }}>
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tienda principal
          </Link>
          {store.logo_url && <img src={store.logo_url} alt={store.name} className="h-10 object-contain" />}
          <span className="text-xs text-muted-foreground">/{store.slug}</span>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: store.font_heading ?? undefined }}>
          {store.hero_headline ?? store.name}
        </h1>
        {(store.hero_subtitle || store.tagline) && (
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{store.hero_subtitle ?? store.tagline}</p>
        )}
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: store.font_heading ?? undefined }}>Catálogo</h2>
        {products.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aún no hay productos asignados a esta sub-tienda.</p>
            <p className="text-xs mt-1">Asigna productos desde el panel admin.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <Link key={p.id} to={`/producto/${p.id}`} className="group">
                <Card className="overflow-hidden hover:border-primary transition-colors">
                  <div className="aspect-square bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-primary font-bold mt-1">${p.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground space-y-1">
        <p>Sub-tienda · {store.name}</p>
        <p>© WAXAPP<span className="text-primary">.</span>MX {new Date().getFullYear()} · Hecho con ciencia.</p>
      </footer>
    </div>
  );
};

export default SubStorePage;

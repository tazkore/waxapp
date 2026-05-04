import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Pencil, Globe, Wand2, CheckCircle2, AlertCircle, Sparkles, Trash2, FileDown, FileUp, Download, Link as LinkIcon, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CsvImporter from "./products/CsvImporter";
import ImportJobsHistory from "./products/ImportJobsHistory";
import AdvancedMetadataEditor, { type AdvancedMetadata } from "./products/AdvancedMetadataEditor";
import VariantMetadataEditor from "./products/VariantMetadataEditor";

type Product = {
  id: string;
  name: string;
  slug: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  category: string | null;
  brand_id: string | null;
  brand_name: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  description: string | null;
  short_description: string | null;
  long_description_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  focus_keyword: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  schema_type: string | null;
  gtin: string | null;
  mpn: string | null;
  weight_grams: number | null;
  dimensions: any;
  tags: string[] | null;
  noindex: boolean;
  nofollow: boolean;
  stock: number;
  // Advanced metadata
  metadata_template: string | null;
  specifications: any;
  warnings: string[] | null;
  ingredients: string[] | null;
  flavor_profile: string[] | null;
  country_of_origin: string | null;
  material: string | null;
  battery_mah: number | null;
  puffs_estimate: number | null;
  nicotine_mg: number | null;
  vaporizer_type: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  strain_type: string | null;
  terpenes: string[] | null;
  capacity_ml: number | null;
  pg_vg_ratio: string | null;
  compatibility: string[] | null;
  warranty_months: number | null;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

const seoScore = (p: Partial<Product>) => {
  let score = 0;
  if (p.meta_title && p.meta_title.length >= 30 && p.meta_title.length <= 60) score += 20;
  if (p.meta_description && p.meta_description.length >= 70 && p.meta_description.length <= 160) score += 20;
  if (p.focus_keyword) score += 10;
  if (p.slug) score += 10;
  if (p.og_image_url || p.image_url) score += 10;
  if (p.meta_keywords && p.meta_keywords.length >= 3) score += 10;
  if (p.long_description_html && p.long_description_html.length > 300) score += 10;
  if (p.gtin || p.mpn) score += 5;
  if (p.brand_name) score += 5;
  return score;
};

const ProductsSection = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  

  const CSV_HEADERS = ["name", "price", "sku", "image_url", "description", "category", "gtin", "brand_name", "stock"];

  const csvEscape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const downloadFile = (filename: string, content: string, mime = "text/csv;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const example = ["Vape Pen Starter", "499", "VP-001", "https://ejemplo.com/img.jpg", "Descripción breve", "Vapes", "1234567890123", "Mi Marca", "10"];
    const csv = CSV_HEADERS.join(",") + "\n" + example.map(csvEscape).join(",") + "\n";
    downloadFile("productos-plantilla.csv", csv);
    toast({ title: "Plantilla descargada", description: "Llena las columnas y súbela en 'Importar CSV'." });
  };

  const exportCsv = () => {
    const headers = [...CSV_HEADERS, "slug", "is_active"];
    const lines = [headers.join(",")];
    for (const p of filtered) {
      lines.push([
        p.name, p.price, p.sku ?? "", p.image_url ?? "",
        (p.description ?? "").replace(/\s+/g, " ").trim(),
        p.category ?? "", p.gtin ?? "", p.brand_name ?? "", p.stock ?? 0,
        p.slug ?? "", p.is_active ? "true" : "false",
      ].map(csvEscape).join(","));
    }
    downloadFile(`productos-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    toast({ title: "Exportado", description: `${filtered.length} productos descargados.` });
  };


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) toast({ title: "Error al cargar", description: error.message, variant: "destructive" });
    setProducts((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.focus_keyword || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const newProduct = () => {
    setEditing({
      id: "", name: "", slug: null, sku: null, price: 0, compare_at_price: null, category: null,
      brand_id: null, brand_name: null, image_url: null, gallery_urls: [], is_active: true, is_featured: false,
      description: null, short_description: null, long_description_html: null,
      meta_title: null, meta_description: null, meta_keywords: [], focus_keyword: null,
      og_image_url: null, canonical_url: null, schema_type: "Product", gtin: null, mpn: null,
      weight_grams: null, dimensions: {}, tags: [], noindex: false, nofollow: false, stock: 0,
      metadata_template: null, specifications: [], warnings: [], ingredients: [], flavor_profile: [],
      country_of_origin: null, material: null, battery_mah: null, puffs_estimate: null,
      nicotine_mg: null, vaporizer_type: null, thc_percentage: null, cbd_percentage: null,
      strain_type: null, terpenes: [], capacity_ml: null, pg_vg_ratio: null,
      compatibility: [], warranty_months: null,
    });
  };

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.is_active).length;
    const draft = total - active;
    const featured = products.filter(p => p.is_featured).length;
    const outOfStock = products.filter(p => (p.stock ?? 0) <= 0).length;
    const avgSeo = total ? Math.round(products.reduce((acc, p) => acc + seoScore(p), 0) / total) : 0;
    return { total, active, draft, featured, outOfStock, avgSeo };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Productos & SEO
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo, metadatos para Google e importación desde sitios web.
          </p>
        </div>
      </div>

      {/* Toolbar de acciones */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
          <FileDown className="h-4 w-4" /> Plantilla CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTab("csv")} className="gap-1.5">
          <FileUp className="h-4 w-4" /> Importar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setImporterMode("single"); setTab("import"); }} className="gap-1.5">
          <LinkIcon className="h-4 w-4" /> Importar de URL (IA)
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setImporterMode("map"); setTab("import"); }} className="gap-1.5">
          <Globe className="h-4 w-4" /> Importar desde sitio web (IA)
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5" disabled={!products.length}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
        <div className="flex-1" />
        <Button onClick={newProduct} size="sm" className="gap-1.5 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} accent="primary" />
        <StatCard label="Activos" value={stats.active} accent="primary" subtext={`${stats.draft} borradores`} />
        <StatCard label="Destacados" value={stats.featured} accent="amber" />
        <StatCard label="Agotados" value={stats.outOfStock} accent={stats.outOfStock > 0 ? "destructive" : "muted"} />
        <StatCard label="SEO promedio" value={`${stats.avgSeo}/100`} accent={stats.avgSeo >= 70 ? "primary" : stats.avgSeo >= 40 ? "amber" : "destructive"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="import">Importar URL</TabsTrigger>
          <TabsTrigger value="csv">Importar CSV</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {tab === "csv" && (
          <Alert className="mt-3 bg-primary/5 border-primary/30">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs">
              💡 Descarga la <button onClick={downloadTemplate} className="underline text-primary font-medium">plantilla CSV</button>, llena los campos y súbela en "Importar CSV". Los nombres de columna deben mantenerse igual.
            </AlertDescription>
          </Alert>
        )}


        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU, palabra clave…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card/50 border-border/60 focus-visible:ring-primary/40"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/30">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No hay productos. Crea uno o importa desde una URL.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onEdit={() => setEditing(p)} score={seoScore(p)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="import">
          <ProductImporter
            onImported={() => { load(); setHistoryKey((k) => k + 1); }}
            onSwitchToCatalog={() => setTab("catalog")}
          />
        </TabsContent>

        <TabsContent value="csv">
          <CsvImporter onImported={load} />
        </TabsContent>

        <TabsContent value="history">
          <ImportJobsHistory refreshKey={historyKey} />
        </TabsContent>
      </Tabs>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

/* ---------------- Stat Card ---------------- */

const accentMap: Record<string, string> = {
  primary: "text-primary",
  amber: "text-amber-400",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

const StatCard = ({ label, value, accent = "primary", subtext }: { label: string; value: string | number; accent?: string; subtext?: string }) => (
  <Card className="border-border/50 bg-gradient-to-br from-card to-card/40 hover:border-primary/30 transition-colors">
    <CardContent className="p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accentMap[accent] ?? accentMap.primary}`} style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        {value}
      </p>
      {subtext && <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>}
    </CardContent>
  </Card>
);

/* ---------------- Product Card ---------------- */

const ProductCard = ({ product: p, onEdit, score }: { product: Product; onEdit: () => void; score: number }) => {
  const scoreColor = score >= 80 ? "text-primary" : score >= 50 ? "text-amber-400" : "text-destructive";
  const scoreBar = score >= 80 ? "bg-primary" : score >= 50 ? "bg-amber-400" : "bg-destructive";
  const outOfStock = (p.stock ?? 0) <= 0;

  return (
    <Card className="group overflow-hidden border-border/50 bg-card/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 flex flex-col">
      {/* Image 16:9 */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-muted/40 to-muted/10 overflow-hidden">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
        {/* Badges over image */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {!p.is_active && (
            <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur border-border/60">
              Borrador
            </Badge>
          )}
          {p.is_featured && (
            <Badge className="text-[10px] bg-amber-400/90 text-black hover:bg-amber-400">
              Destacado
            </Badge>
          )}
          {p.noindex && (
            <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur text-amber-400 border-amber-400/40">
              noindex
            </Badge>
          )}
        </div>
        {outOfStock && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-[10px] bg-destructive/90 text-destructive-foreground border-destructive">
              Agotado
            </Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug" title={p.name}>
            {p.name}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate font-mono">
            /{p.slug || slugify(p.name)}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              ${Number(p.price).toLocaleString("es-MX")}
            </p>
            {p.compare_at_price && p.compare_at_price > p.price && (
              <p className="text-[11px] text-muted-foreground line-through">
                ${Number(p.compare_at_price).toLocaleString("es-MX")}
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stock: <span className={outOfStock ? "text-destructive font-semibold" : "text-foreground font-medium"}>{p.stock ?? 0}</span>
          </p>
        </div>

        {/* SEO bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SEO</span>
            <span className={`text-[11px] font-semibold ${scoreColor}`}>{score}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div className={`h-full ${scoreBar} transition-all`} style={{ width: `${Math.min(100, score)}%` }} />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="gap-1 mt-1 border-border/60 hover:border-primary/50 hover:text-primary"
        >
          <Pencil className="h-3 w-3" /> Editar
        </Button>
      </CardContent>
    </Card>
  );
};

/* ---------------- Editor ---------------- */

const ProductEditor = ({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [p, setP] = useState<Product>(product);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const score = seoScore(p);

  const save = async () => {
    if (!p.name.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: p.name,
      slug: p.slug || slugify(p.name),
      sku: p.sku || null,
      price: Number(p.price) || 0,
      compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
      category: p.category || null,
      brand_name: p.brand_name || null,
      image_url: p.image_url || null,
      gallery_urls: p.gallery_urls || [],
      is_active: p.is_active,
      is_featured: p.is_featured,
      description: p.description || null,
      short_description: p.short_description || null,
      long_description_html: p.long_description_html || null,
      meta_title: p.meta_title || null,
      meta_description: p.meta_description || null,
      meta_keywords: p.meta_keywords || [],
      focus_keyword: p.focus_keyword || null,
      og_image_url: p.og_image_url || null,
      canonical_url: p.canonical_url || null,
      schema_type: p.schema_type || "Product",
      gtin: p.gtin || null,
      mpn: p.mpn || null,
      weight_grams: p.weight_grams ? Number(p.weight_grams) : null,
      dimensions: p.dimensions || {},
      tags: p.tags || [],
      noindex: !!p.noindex,
      nofollow: !!p.nofollow,
      stock: Number(p.stock) || 0,
      // Advanced metadata
      metadata_template: p.metadata_template || null,
      specifications: Array.isArray(p.specifications) ? p.specifications : [],
      warnings: p.warnings || [],
      ingredients: p.ingredients || [],
      flavor_profile: p.flavor_profile || [],
      country_of_origin: p.country_of_origin || null,
      material: p.material || null,
      battery_mah: p.battery_mah != null ? Number(p.battery_mah) : null,
      puffs_estimate: p.puffs_estimate != null ? Number(p.puffs_estimate) : null,
      nicotine_mg: p.nicotine_mg != null ? Number(p.nicotine_mg) : null,
      vaporizer_type: p.vaporizer_type || null,
      thc_percentage: p.thc_percentage != null ? Number(p.thc_percentage) : null,
      cbd_percentage: p.cbd_percentage != null ? Number(p.cbd_percentage) : null,
      strain_type: p.strain_type || null,
      terpenes: p.terpenes || [],
      capacity_ml: p.capacity_ml != null ? Number(p.capacity_ml) : null,
      pg_vg_ratio: p.pg_vg_ratio || null,
      compatibility: p.compatibility || [],
      warranty_months: p.warranty_months != null ? Number(p.warranty_months) : null,
    };
    const result = p.id
      ? await supabase.from("products").update(payload).eq("id", p.id).select().single()
      : await supabase.from("products").insert(payload).select().single();
    setSaving(false);
    if (result.error) {
      toast({ title: "Error al guardar", description: result.error.message, variant: "destructive" });
      return;
    }
    if (result.data && !p.id) {
      // Mantener el editor abierto con el id ya asignado para que se puedan agregar variantes
      setP((prev) => ({ ...prev, ...(result.data as any) }));
      toast({ title: "Producto creado", description: "Ahora puedes agregar variantes y metadatos avanzados." });
      return;
    }
    toast({ title: "Producto guardado" });
    onSaved();
  };

  const generateSeoWithAi = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-ai", {
        body: {
          mode: "product_seo",
          product: { name: p.name, description: p.description, category: p.category, brand_name: p.brand_name },
        },
      });
      if (error) throw error;
      const result = data?.result || data || {};
      if (result.meta_title) set("meta_title", result.meta_title);
      if (result.meta_description) set("meta_description", result.meta_description);
      if (result.focus_keyword) set("focus_keyword", result.focus_keyword);
      if (Array.isArray(result.meta_keywords)) set("meta_keywords", result.meta_keywords);
      if (result.short_description) set("short_description", result.short_description);
      toast({ title: "SEO generado con IA" });
    } catch (e: any) {
      toast({
        title: "IA no disponible",
        description: "Rellena los campos manualmente. " + (e?.message || ""),
        variant: "destructive",
      });
    } finally {
      setAiBusy(false);
    }
  };

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": p.schema_type || "Product",
    name: p.name,
    description: p.meta_description || p.short_description || p.description || undefined,
    image: p.og_image_url || p.image_url || undefined,
    sku: p.sku || undefined,
    gtin: p.gtin || undefined,
    mpn: p.mpn || undefined,
    brand: p.brand_name ? { "@type": "Brand", name: p.brand_name } : undefined,
    offers: {
      "@type": "Offer",
      price: Number(p.price) || 0,
      priceCurrency: "MXN",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  }), [p]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {p.id ? "Editar producto" : "Nuevo producto"}
            <Badge variant="outline" className={score >= 80 ? "text-primary border-primary/40" : score >= 50 ? "text-amber-500 border-amber-500/40" : "text-destructive border-destructive/40"}>
              SEO {score}/100
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="meta">Metadatos</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *"><Input value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Slug (URL)"><Input value={p.slug || ""} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(p.name)} /></Field>
              <Field label="SKU"><Input value={p.sku || ""} onChange={(e) => set("sku", e.target.value)} /></Field>
              <Field label="Categoría"><Input value={p.category || ""} onChange={(e) => set("category", e.target.value)} /></Field>
              <Field label="Precio (MXN)"><Input type="number" value={p.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
              <Field label="Precio comparación"><Input type="number" value={p.compare_at_price || ""} onChange={(e) => set("compare_at_price", Number(e.target.value) || null)} /></Field>
              <Field label="Stock"><Input type="number" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
              <Field label="Marca"><Input value={p.brand_name || ""} onChange={(e) => set("brand_name", e.target.value)} /></Field>
              <Field label="Imagen principal (URL)"><Input value={p.image_url || ""} onChange={(e) => set("image_url", e.target.value)} /></Field>
              <Field label="OG Image (compartir)"><Input value={p.og_image_url || ""} onChange={(e) => set("og_image_url", e.target.value)} /></Field>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.is_active} onCheckedChange={(v) => set("is_active", !!v)} /> Activo</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.is_featured} onCheckedChange={(v) => set("is_featured", !!v)} /> Destacado</label>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-3 pt-4">
            <Field label="Descripción corta (resumen)"><Textarea value={p.short_description || ""} onChange={(e) => set("short_description", e.target.value)} rows={2} /></Field>
            <Field label="Descripción"><Textarea value={p.description || ""} onChange={(e) => set("description", e.target.value)} rows={4} /></Field>
            <Field label="Descripción larga (HTML)"><Textarea value={p.long_description_html || ""} onChange={(e) => set("long_description_html", e.target.value)} rows={6} className="font-mono text-xs" /></Field>
            <Field label="Etiquetas (separadas por coma)">
              <Input value={(p.tags || []).join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
            </Field>
          </TabsContent>

          <TabsContent value="meta" className="space-y-3 pt-4">
            <AdvancedMetadataEditor
              hint={{ name: p.name, category: p.category || undefined }}
              value={{
                metadata_template: p.metadata_template,
                specifications: Array.isArray(p.specifications) ? p.specifications : [],
                warnings: p.warnings || [],
                ingredients: p.ingredients || [],
                flavor_profile: p.flavor_profile || [],
                country_of_origin: p.country_of_origin,
                material: p.material,
                battery_mah: p.battery_mah,
                puffs_estimate: p.puffs_estimate,
                nicotine_mg: p.nicotine_mg,
                vaporizer_type: p.vaporizer_type,
                thc_percentage: p.thc_percentage,
                cbd_percentage: p.cbd_percentage,
                strain_type: p.strain_type,
                terpenes: p.terpenes || [],
                capacity_ml: p.capacity_ml,
                pg_vg_ratio: p.pg_vg_ratio,
                compatibility: p.compatibility || [],
                warranty_months: p.warranty_months,
              }}
              onChange={(v) => {
                setP((prev) => ({
                  ...prev,
                  metadata_template: v.metadata_template ?? null,
                  specifications: v.specifications ?? [],
                  warnings: v.warnings ?? [],
                  ingredients: v.ingredients ?? [],
                  flavor_profile: v.flavor_profile ?? [],
                  country_of_origin: v.country_of_origin ?? null,
                  material: v.material ?? null,
                  battery_mah: v.battery_mah ?? null,
                  puffs_estimate: v.puffs_estimate ?? null,
                  nicotine_mg: v.nicotine_mg ?? null,
                  vaporizer_type: v.vaporizer_type ?? null,
                  thc_percentage: v.thc_percentage ?? null,
                  cbd_percentage: v.cbd_percentage ?? null,
                  strain_type: v.strain_type ?? null,
                  terpenes: v.terpenes ?? [],
                  capacity_ml: v.capacity_ml ?? null,
                  pg_vg_ratio: v.pg_vg_ratio ?? null,
                  compatibility: v.compatibility ?? [],
                  warranty_months: v.warranty_months ?? null,
                }));
              }}
            />
          </TabsContent>

          <TabsContent value="variants" className="space-y-3 pt-4">
            <VariantMetadataEditor productId={p.id || null} />
          </TabsContent>

          <TabsContent value="seo" className="space-y-3 pt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={generateSeoWithAi} disabled={aiBusy} className="gap-2">
                {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generar SEO con IA
              </Button>
            </div>
            <Field label={`Meta título (${(p.meta_title || "").length}/60)`}>
              <Input value={p.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} maxLength={70} />
            </Field>
            <Field label={`Meta descripción (${(p.meta_description || "").length}/160)`}>
              <Textarea value={p.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} rows={2} maxLength={170} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Palabra clave principal"><Input value={p.focus_keyword || ""} onChange={(e) => set("focus_keyword", e.target.value)} /></Field>
              <Field label="URL canónica"><Input value={p.canonical_url || ""} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://…" /></Field>
            </div>
            <Field label="Palabras clave (separadas por coma)">
              <Input value={(p.meta_keywords || []).join(", ")} onChange={(e) => set("meta_keywords", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
            </Field>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.noindex} onCheckedChange={(v) => set("noindex", !!v)} /> noindex</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.nofollow} onCheckedChange={(v) => set("nofollow", !!v)} /> nofollow</label>
            </div>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Vista previa Google</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-primary truncate">{p.canonical_url || `https://waxapp.mx/producto/${p.slug || slugify(p.name)}`}</p>
                <p className="text-base text-foreground font-medium truncate">{p.meta_title || p.name || "Título del producto"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.meta_description || p.short_description || "Sin descripción meta…"}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schema" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo Schema.org">
                <Input value={p.schema_type || "Product"} onChange={(e) => set("schema_type", e.target.value)} />
              </Field>
              <Field label="GTIN"><Input value={p.gtin || ""} onChange={(e) => set("gtin", e.target.value)} /></Field>
              <Field label="MPN"><Input value={p.mpn || ""} onChange={(e) => set("mpn", e.target.value)} /></Field>
              <Field label="Peso (gramos)"><Input type="number" value={p.weight_grams || ""} onChange={(e) => set("weight_grams", Number(e.target.value) || null)} /></Field>
            </div>
            <Field label="JSON-LD generado">
              <pre className="bg-muted p-3 rounded text-[10px] overflow-auto max-h-64">{JSON.stringify(jsonLd, null, 2)}</pre>
            </Field>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {p.id && (
            <Button variant="destructive" onClick={async () => {
              if (!confirm("¿Eliminar este producto?")) return;
              await supabase.from("products").delete().eq("id", p.id);
              toast({ title: "Eliminado" });
              onSaved();
            }} className="gap-2"><Trash2 className="h-4 w-4" /> Eliminar</Button>
          )}
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

/* ---------------- Importer ---------------- */

type Provider = "firecrawl" | "jina" | "scrapingbee";

const ProductImporter = ({ onImported, onSwitchToCatalog }: { onImported: () => void; onSwitchToCatalog: () => void }) => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<Provider>("firecrawl");
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [selectedP, setSelectedP] = useState<Set<number>>(new Set());

  const map = async () => {
    if (!url.trim()) return;
    setBusy("map");
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-map", { body: { url, limit: 100, provider } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const found: string[] = data.links || [];
      setLinks(found);
      const likely = found.filter((l) => /\/(product|producto|p|item|productos|shop|tienda)[\/-]/i.test(l));
      setSelected(new Set(likely.length ? likely : found.slice(0, 20)));
      toast({ title: "Sitio mapeado", description: `${found.length} URLs encontradas` });
    } catch (e: any) {
      toast({ title: "Error al mapear", description: e?.message || String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  const extract = async () => {
    if (selected.size === 0) return;
    setBusy("extract");
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", {
        body: { urls: Array.from(selected), provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list = data.products || [];
      setProducts(list);
      setSelectedP(new Set(list.map((_: any, i: number) => i)));
      toast({ title: "Productos extraídos", description: `${list.length} candidatos` });
    } catch (e: any) {
      toast({ title: "Error al extraer", description: e?.message || String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  const importProducts = async () => {
    const items = Array.from(selectedP).map((i) => products[i]).filter(Boolean);
    if (!items.length) return;
    setBusy("import");
    try {
      const rows = items.map((it: any) => ({
        name: it.name || "Producto sin nombre",
        slug: slugify(it.name || "producto-" + Date.now()),
        description: it.description || null,
        short_description: it.description ? String(it.description).slice(0, 160) : null,
        price: Number(it.price) || 0,
        sku: it.sku || null,
        category: it.category || null,
        image_url: Array.isArray(it.images) ? it.images[0] : it.image_url || null,
        gallery_urls: Array.isArray(it.images) ? it.images : [],
        meta_title: (it.name || "").slice(0, 60),
        meta_description: it.description ? String(it.description).slice(0, 160) : null,
        focus_keyword: (it.name || "").split(" ").slice(0, 3).join(" "),
        canonical_url: it.source_url || null,
        is_active: false,
      }));
      const { error } = await supabase.from("products").insert(rows);
      if (error) throw error;
      toast({ title: "Importados", description: `${rows.length} productos creados como borradores` });
      setProducts([]); setSelectedP(new Set()); setLinks([]); setSelected(new Set());
      onImported();
      onSwitchToCatalog();
    } catch (e: any) {
      toast({ title: "Error al importar", description: e?.message || String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Importar productos desde URL</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tienda-ejemplo.com" className="flex-1 min-w-[260px]" />
            <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className="bg-muted border border-border rounded px-2 text-sm">
              <option value="firecrawl">Firecrawl</option>
              <option value="jina">Jina Reader</option>
              <option value="scrapingbee">ScrapingBee</option>
            </select>
            <Button onClick={map} disabled={busy === "map" || !url.trim()} className="gap-2">
              {busy === "map" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Mapear sitio
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Los productos se importan como borradores (inactivos) para que los revises antes de publicar.
          </p>
        </CardContent>
      </Card>

      {links.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{selected.size} de {links.length} URLs seleccionadas</CardTitle>
            <Button onClick={extract} disabled={busy === "extract" || selected.size === 0} size="sm" className="gap-2">
              {busy === "extract" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Extraer productos
            </Button>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto space-y-1">
            {links.map((l) => (
              <label key={l} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                <Checkbox checked={selected.has(l)} onCheckedChange={(v) => {
                  const n = new Set(selected); v ? n.add(l) : n.delete(l); setSelected(n);
                }} />
                <span className="truncate text-muted-foreground">{l}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{selectedP.size} de {products.length} productos a importar</CardTitle>
            <Button onClick={importProducts} disabled={busy === "import" || selectedP.size === 0} size="sm" className="gap-2">
              {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Importar al catálogo
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto space-y-2">
            {products.map((it: any, i: number) => (
              <label key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selectedP.has(i)} onCheckedChange={(v) => {
                  const n = new Set(selectedP); v ? n.add(i) : n.delete(i); setSelectedP(n);
                }} />
                {it.images?.[0] && <img src={it.images[0]} alt="" className="h-10 w-10 rounded object-cover bg-muted" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground truncate">${it.price ?? "?"} · {it.category || "Sin categoría"}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductsSection;

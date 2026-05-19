import { useEffect, useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';
import { getSetting, setSetting } from '@/lib/siteSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Rocket, Globe, Search, FileText, Settings2, Plus, Trash2, Loader2,
  Sparkles, CheckCircle2, AlertCircle, ExternalLink, ArrowRight,
  BarChart3, Link2, RefreshCw, Info, Package, ChevronRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface SeoPage {
  id: string;
  page_path: string;
  page_title: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[];
  og_image_url: string | null;
  is_indexed: boolean;
  auto_sitemap: boolean;
  canonical_url: string | null;
}

interface SeoRedirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  is_wildcard: boolean;
  priority: number;
  reason: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pageScore(p: SeoPage): number {
  let s = 0;
  if (p.meta_title && p.meta_title.length <= 60) s += 25;
  if (p.meta_description && p.meta_description.length <= 160) s += 25;
  if ((p.keywords ?? []).length >= 3) s += 25;
  if (p.og_image_url) s += 25;
  return s;
}

function scoreColor(s: number) {
  if (s >= 75) return 'text-green-400';
  if (s >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(s: number) {
  if (s >= 75) return 'bg-green-400';
  if (s >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

function lenColor(len: number, max: number) {
  if (len === 0) return 'text-muted-foreground';
  if (len > max) return 'text-red-400';
  if (len > max * 0.9) return 'text-amber-400';
  return 'text-green-400';
}

const emptyPage = {
  page_path: '', page_title: '', meta_title: '', meta_description: '',
  keywords: [] as string[], og_image_url: '', is_indexed: true,
  auto_sitemap: true, canonical_url: '',
};

const emptyRedirect = {
  from_path: '', to_path: '', status_code: 301,
  is_active: true, is_wildcard: false, priority: 0,
};

// ── AI helper ────────────────────────────────────────────────────────────────

async function generateSeoWithAI(pagePath: string, pageTitle: string): Promise<{ meta_title: string; meta_description: string; keywords: string[] }> {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY no configurada');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `Eres un experto SEO para tiendas de cannabis y vapes en México. Optimiza para la ruta "${pagePath}" con título interno "${pageTitle}".
Devuelve SOLO JSON válido (sin markdown):
{
  "meta_title": "(máx 60 chars, incluye keyword principal + WAXAPP al final)",
  "meta_description": "(máx 160 chars, persuasivo en español mexicano, incluye CTA como 'Compra segura', 'Envío express')",
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"]
}`;
  const res = await model.generateContent(prompt);
  const text = res.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

// ── Main Component ───────────────────────────────────────────────────────────

const SeoSection = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('dashboard');

  // Data
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [redirects, setRedirects] = useState<SeoRedirect[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [seoProductPaths, setSeoProductPaths] = useState<Set<string>>(new Set());
  const [globalSettings, setGlobalSettings] = useState({ sitemap_enabled: true, robots_noindex: false });

  // Loading states
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRedirects, setLoadingRedirects] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Pages editor state
  const [selectedPage, setSelectedPage] = useState<SeoPage | null>(null);
  const [editData, setEditData] = useState(emptyPage);
  const [savingPage, setSavingPage] = useState(false);
  const [aiLoadingPage, setAiLoadingPage] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_path: '', page_title: '' });
  const [creating, setCreating] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const [deletingPage, setDeletingPage] = useState(false);

  // Products tab state
  const [aiLoadingProduct, setAiLoadingProduct] = useState<string | null>(null);
  const [batchAiLoading, setBatchAiLoading] = useState(false);

  // Redirects state
  const [newRedirect, setNewRedirect] = useState(emptyRedirect);
  const [addingRedirect, setAddingRedirect] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    const { data, error } = await supabase.from('seo_pages').select('*').order('page_path');
    if (!error) setPages((data ?? []) as SeoPage[]);
    setLoadingPages(false);
  }, []);

  const loadRedirects = useCallback(async () => {
    setLoadingRedirects(true);
    const { data } = await (supabase as any).from('seo_redirects').select('*').order('created_at', { ascending: false });
    setRedirects((data ?? []) as SeoRedirect[]);
    setLoadingRedirects(false);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const [{ data: prods }, { data: seoPaths }] = await Promise.all([
      supabase.from('products').select('id,name,slug,description,price,image_url').eq('is_active', true).order('name'),
      supabase.from('seo_pages').select('page_path').like('page_path', '/producto/%'),
    ]);
    setProducts((prods ?? []) as Product[]);
    setSeoProductPaths(new Set((seoPaths ?? []).map((r: any) => r.page_path)));
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    loadPages();
    getSetting('seo_global', { sitemap_enabled: true, robots_noindex: false })
      .then((v) => setGlobalSettings(v))
      .catch(() => {});
  }, [loadPages]);

  useEffect(() => {
    if (tab === 'redirects' && redirects.length === 0) loadRedirects();
    if (tab === 'products' && products.length === 0) loadProducts();
  }, [tab]);

  // ── Page editor helpers ───────────────────────────────────────────────────

  const selectPage = (p: SeoPage) => {
    setSelectedPage(p);
    setEditData({
      page_path: p.page_path,
      page_title: p.page_title,
      meta_title: p.meta_title ?? '',
      meta_description: p.meta_description ?? '',
      keywords: p.keywords ?? [],
      og_image_url: p.og_image_url ?? '',
      is_indexed: p.is_indexed,
      auto_sitemap: p.auto_sitemap,
      canonical_url: p.canonical_url ?? '',
    });
    setKwInput('');
  };

  const savePage = async () => {
    if (!selectedPage) return;
    setSavingPage(true);
    const payload = {
      page_path: editData.page_path.trim() || selectedPage.page_path,
      page_title: editData.page_title.trim() || selectedPage.page_title,
      meta_title: editData.meta_title.trim() || null,
      meta_description: editData.meta_description.trim() || null,
      keywords: editData.keywords,
      og_image_url: editData.og_image_url.trim() || null,
      is_indexed: editData.is_indexed,
      auto_sitemap: editData.auto_sitemap,
      canonical_url: editData.canonical_url.trim() || null,
    };
    const { error } = await supabase.from('seo_pages').update(payload).eq('id', selectedPage.id);
    setSavingPage(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Guardado', description: editData.page_path });
    await loadPages();
    setSelectedPage({ ...selectedPage, ...payload } as SeoPage);
  };

  const createPage = async () => {
    if (!newPage.page_path.trim() || !newPage.page_title.trim()) {
      toast({ title: 'Ruta y título son obligatorios', variant: 'destructive' }); return;
    }
    setCreating(true);
    const path = newPage.page_path.startsWith('/') ? newPage.page_path.trim() : `/${newPage.page_path.trim()}`;
    const { error } = await supabase.from('seo_pages').insert({ page_path: path, page_title: newPage.page_title.trim() });
    setCreating(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Página SEO creada', description: path });
    setCreateOpen(false);
    setNewPage({ page_path: '', page_title: '' });
    await loadPages();
  };

  const deletePage = async () => {
    if (!selectedPage) return;
    if (!confirm(`¿Eliminar la página SEO "${selectedPage.page_path}"? Los meta tags de esta ruta volverán a los valores por defecto.`)) return;
    setDeletingPage(true);
    await supabase.from('seo_pages').delete().eq('id', selectedPage.id);
    setDeletingPage(false);
    toast({ title: 'Página eliminada' });
    setSelectedPage(null);
    await loadPages();
  };

  const generateAI = async () => {
    if (!selectedPage) return;
    setAiLoadingPage(true);
    try {
      const result = await generateSeoWithAI(editData.page_path || selectedPage.page_path, editData.page_title || selectedPage.page_title);
      setEditData((prev) => ({
        ...prev,
        meta_title: result.meta_title ?? prev.meta_title,
        meta_description: result.meta_description ?? prev.meta_description,
        keywords: result.keywords?.length ? result.keywords : prev.keywords,
      }));
      toast({ title: '✨ IA generó el SEO', description: 'Revisa los campos y guarda.' });
    } catch (e: any) {
      toast({ title: 'Error IA', description: e?.message ?? 'Error desconocido', variant: 'destructive' });
    } finally {
      setAiLoadingPage(false);
    }
  };

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || (editData.keywords ?? []).includes(kw)) return;
    setEditData((prev) => ({ ...prev, keywords: [...(prev.keywords ?? []), kw] }));
    setKwInput('');
  };

  const removeKeyword = (kw: string) =>
    setEditData((prev) => ({ ...prev, keywords: (prev.keywords ?? []).filter((k) => k !== kw) }));

  // ── Product AI helpers ────────────────────────────────────────────────────

  const optimizeProduct = async (product: Product) => {
    setAiLoadingProduct(product.id);
    try {
      const { data, error } = await supabase.functions.invoke('product-autofill', {
        body: { product_id: product.id, only_missing: false },
      });
      if (error) throw error;
      if (!data?.meta_title) throw new Error('La IA no devolvió resultados. Intenta de nuevo.');
      const seoPath = `/producto/${product.slug}`;
      const { error: upsertErr } = await supabase.from('seo_pages').upsert({
        page_path: seoPath,
        page_title: product.name,
        meta_title: data.meta_title ?? null,
        meta_description: data.meta_description ?? null,
        keywords: data.meta_keywords ?? [],
        is_indexed: true,
        auto_sitemap: true,
      }, { onConflict: 'page_path' });
      if (upsertErr) throw upsertErr;
      setSeoProductPaths((prev) => new Set([...prev, seoPath]));
      toast({ title: `✅ SEO aplicado: ${product.name}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Error al optimizar', variant: 'destructive' });
    } finally {
      setAiLoadingProduct(null);
    }
  };

  const optimizeAllProducts = async () => {
    const pending = products.filter((p) => !seoProductPaths.has(`/producto/${p.slug}`));
    if (!pending.length) { toast({ title: 'Todos los productos ya tienen SEO' }); return; }
    setBatchAiLoading(true);
    let done = 0;
    for (const p of pending) {
      await optimizeProduct(p);
      done++;
      if (done < pending.length) await new Promise((r) => setTimeout(r, 1200));
    }
    setBatchAiLoading(false);
    toast({ title: `✨ ${done} productos optimizados con IA` });
  };

  // ── Redirect helpers ──────────────────────────────────────────────────────

  const addRedirect = async () => {
    if (!newRedirect.from_path.trim() || !newRedirect.to_path.trim()) return;
    setAddingRedirect(true);
    const from = newRedirect.from_path.startsWith('/') ? newRedirect.from_path.trim() : `/${newRedirect.from_path.trim()}`;
    const to = newRedirect.to_path.trim();
    const { error } = await (supabase as any).from('seo_redirects').insert({
      from_path: from, to_path: to, status_code: newRedirect.status_code,
      is_active: true, is_wildcard: from.includes('*') || from.includes(':'),
      priority: newRedirect.priority,
    });
    setAddingRedirect(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Redirect creado' });
    setNewRedirect(emptyRedirect);
    loadRedirects();
  };

  const toggleRedirect = async (id: string, isActive: boolean) => {
    await (supabase as any).from('seo_redirects').update({ is_active: !isActive }).eq('id', id);
    setRedirects((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !isActive } : r));
  };

  const deleteRedirect = async (id: string) => {
    if (!confirm('¿Eliminar este redirect?')) return;
    await (supabase as any).from('seo_redirects').delete().eq('id', id);
    setRedirects((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Redirect eliminado' });
  };

  // ── Global settings ───────────────────────────────────────────────────────

  const saveGlobal = async (key: string, value: boolean) => {
    setSavingGlobal(true);
    const next = { ...globalSettings, [key]: value };
    setGlobalSettings(next);
    await setSetting('seo_global', next).catch(() => {});
    setSavingGlobal(false);
    toast({ title: 'Configuración guardada' });
  };

  // ── Dashboard stats ───────────────────────────────────────────────────────

  const overallScore = pages.length
    ? Math.round(pages.reduce((sum, p) => sum + pageScore(p), 0) / pages.length)
    : 0;
  const indexedCount = pages.filter((p) => p.is_indexed).length;
  const withMeta = pages.filter((p) => p.meta_title && p.meta_description).length;
  const withOg = pages.filter((p) => p.og_image_url).length;
  const withKw = pages.filter((p) => (p.keywords ?? []).length >= 3).length;
  const worstPages = [...pages].sort((a, b) => pageScore(a) - pageScore(b)).slice(0, 5);

  const metaTitleLen = (editData.meta_title ?? '').length;
  const metaDescLen = (editData.meta_description ?? '').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> SEO & Indexación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Optimiza con IA para posicionar WAXAPP en el #1 de Google.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/sitemap.xml" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border rounded-md px-3 py-1.5 transition-colors">
            <Globe className="h-3.5 w-3.5" /> Sitemap
          </a>
          <a href="/robots.txt" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border rounded-md px-3 py-1.5 transition-colors">
            <FileText className="h-3.5 w-3.5" /> Robots.txt
          </a>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Páginas</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Productos IA</TabsTrigger>
          <TabsTrigger value="redirects" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Redirects</TabsTrigger>
          <TabsTrigger value="technical" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Técnico</TabsTrigger>
        </TabsList>

        {/* ── TAB: DASHBOARD ────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5">
          {loadingPages ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Score + stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Big score */}
                <Card className="col-span-2 md:col-span-1 p-4 flex flex-col items-center justify-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Score SEO</p>
                  <div className={`text-5xl font-black ${scoreColor(overallScore)}`}>{overallScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">/ 100</div>
                  <Progress value={overallScore} className="mt-3 h-1.5 w-full" />
                </Card>
                {[
                  { label: 'Páginas totales', value: pages.length, icon: FileText },
                  { label: 'Indexadas', value: indexedCount, icon: Search },
                  { label: 'Con Meta + Desc', value: withMeta, icon: CheckCircle2 },
                  { label: 'Con OG Image', value: withOg, icon: Globe },
                ].map(({ label, value, icon: Icon }) => (
                  <Card key={label} className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="text-3xl font-bold text-foreground mt-1">{value}</div>
                    <Icon className="h-5 w-5 text-muted-foreground/30 mt-1" />
                  </Card>
                ))}
              </div>

              {/* Páginas con peor SEO */}
              {worstPages.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400" /> Páginas que necesitan optimización
                    </CardTitle>
                    <CardDescription>Haz clic para editar o usa la IA para optimizarlas en segundos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {worstPages.map((p) => {
                      const s = pageScore(p);
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => { selectPage(p); setTab('pages'); }}>
                          <div className={`text-lg font-black w-10 text-center ${scoreColor(s)}`}>{s}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.page_path}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.page_title}</p>
                          </div>
                          <div className="flex gap-1">
                            {!p.meta_title && <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-400">sin título</Badge>}
                            {!p.og_image_url && <Badge variant="outline" className="text-[9px]">sin OG</Badge>}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {pages.length === 0 && (
                <Card className="p-10 text-center border-dashed">
                  <Rocket className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-medium">Aún no hay páginas SEO configuradas</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Crea entradas para cada ruta pública y la IA las optimizará automáticamente.
                  </p>
                  <Button onClick={() => { setTab('pages'); setCreateOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" /> Crear primera página SEO
                  </Button>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TAB: PÁGINAS ──────────────────────────────────────────────── */}
        <TabsContent value="pages">
          {loadingPages ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Page list */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{pages.length} páginas</p>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" /> Nueva
                  </Button>
                </div>
                {pages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin páginas. Crea la primera.</p>
                )}
                {pages.map((p) => {
                  const s = pageScore(p);
                  return (
                    <button key={p.id} onClick={() => selectPage(p)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedPage?.id === p.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80 hover:bg-muted/40'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-black w-8 ${scoreColor(s)}`}>{s}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-foreground truncate">{p.page_path}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.page_title}</p>
                        </div>
                        {!p.is_indexed && <Badge variant="secondary" className="text-[9px]">noindex</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Editor */}
              <div className="lg:col-span-3">
                {!selectedPage ? (
                  <Card className="p-10 text-center h-full flex flex-col items-center justify-center">
                    <Search className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecciona una página para editar su SEO</p>
                  </Card>
                ) : (
                  <Card className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-foreground">{selectedPage.page_path}</p>
                        <p className="text-xs text-muted-foreground">{selectedPage.page_title}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                          className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs"
                          disabled={aiLoadingPage || !import.meta.env.VITE_GEMINI_API_KEY}
                          onClick={generateAI}>
                          {aiLoadingPage
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Sparkles className="h-3.5 w-3.5" />}
                          Generar con IA
                        </Button>
                        <Button size="sm" onClick={savePage} disabled={savingPage} className="text-xs">
                          {savingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Guardar
                        </Button>
                      </div>
                    </div>

                    {/* Meta Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Meta Título</Label>
                        <span className={`text-xs font-mono ${lenColor(metaTitleLen, 60)}`}>{metaTitleLen}/60</span>
                      </div>
                      <Input value={editData.meta_title} onChange={(e) => setEditData((p) => ({ ...p, meta_title: e.target.value }))}
                        placeholder="Título SEO optimizado — WAXAPP" />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Meta Descripción</Label>
                        <span className={`text-xs font-mono ${lenColor(metaDescLen, 160)}`}>{metaDescLen}/160</span>
                      </div>
                      <Textarea rows={3} value={editData.meta_description}
                        onChange={(e) => setEditData((p) => ({ ...p, meta_description: e.target.value }))}
                        placeholder="Descripción persuasiva con CTA. Máx 160 chars." />
                    </div>

                    {/* Keywords */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Keywords</Label>
                      <div className="flex gap-2">
                        <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          placeholder="Añadir keyword…" className="text-sm" />
                        <Button size="sm" variant="outline" onClick={addKeyword}>+</Button>
                      </div>
                      {(editData.keywords ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(editData.keywords ?? []).map((kw) => (
                            <Badge key={kw} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20"
                              onClick={() => removeKeyword(kw)}>
                              {kw} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* OG Image */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">OG Image URL <span className="text-muted-foreground">(1200×630 px recomendado)</span></Label>
                      <Input value={editData.og_image_url} onChange={(e) => setEditData((p) => ({ ...p, og_image_url: e.target.value }))}
                        placeholder="https://…" />
                    </div>

                    {/* Canonical */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Canonical URL <span className="text-muted-foreground">(opcional)</span></Label>
                      <Input value={editData.canonical_url}
                        onChange={(e) => setEditData((p) => ({ ...p, canonical_url: e.target.value }))}
                        placeholder="https://waxapp.mx/ruta-canónica" />
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                        <Switch checked={editData.is_indexed} onCheckedChange={(v) => setEditData((p) => ({ ...p, is_indexed: v }))} />
                        <div>
                          <Label className="text-xs cursor-pointer">Indexar</Label>
                          <p className="text-[10px] text-muted-foreground">Google puede indexar esta página</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                        <Switch checked={editData.auto_sitemap} onCheckedChange={(v) => setEditData((p) => ({ ...p, auto_sitemap: v }))} />
                        <div>
                          <Label className="text-xs cursor-pointer">En Sitemap</Label>
                          <p className="text-[10px] text-muted-foreground">Incluir en sitemap.xml</p>
                        </div>
                      </div>
                    </div>

                    {/* Google Preview */}
                    {(editData.meta_title || editData.meta_description) && (
                      <div className="rounded-lg border border-border/60 bg-white p-4">
                        <p className="text-[10px] text-gray-400 mb-1 font-medium uppercase">Vista previa Google</p>
                        <p className="text-sm text-blue-700 font-medium leading-tight">
                          {editData.meta_title || selectedPage.page_title}
                        </p>
                        <p className="text-[11px] text-green-700 mt-0.5">
                          waxapp.mx{selectedPage.page_path}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                          {editData.meta_description}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/60 flex justify-end">
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs"
                        onClick={deletePage} disabled={deletingPage}>
                        {deletingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                        Eliminar página SEO
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Create dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader><DialogTitle>Nueva página SEO</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ruta *</Label>
                  <Input value={newPage.page_path} onChange={(e) => setNewPage((p) => ({ ...p, page_path: e.target.value }))}
                    placeholder="/mi-ruta" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título interno *</Label>
                  <Input value={newPage.page_title} onChange={(e) => setNewPage((p) => ({ ...p, page_title: e.target.value }))}
                    placeholder="Página Inicio" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={createPage} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── TAB: PRODUCTOS IA ─────────────────────────────────────────── */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">SEO por Producto con IA</h3>
              <p className="text-sm text-muted-foreground">
                La IA genera meta_title, meta_description y keywords para cada producto y los aplica automáticamente.
              </p>
            </div>
            <Button
              onClick={optimizeAllProducts}
              disabled={batchAiLoading || loadingProducts}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
              variant="outline"
            >
              {batchAiLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              Optimizar productos sin SEO
            </Button>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : products.length === 0 ? (
            <Card className="p-10 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay productos activos aún.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const hasSeo = seoProductPaths.has(`/producto/${product.slug}`);
                const isOptimizing = aiLoadingProduct === product.id;
                return (
                  <div key={product.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                      : <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">/producto/{product.slug}</p>
                    </div>
                    {hasSeo
                      ? <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-400/30 flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> SEO listo
                        </Badge>
                      : <Badge variant="outline" className="text-[10px] border-amber-400/30 text-amber-400 flex-shrink-0">
                          Sin SEO
                        </Badge>
                    }
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 flex-shrink-0"
                      disabled={isOptimizing || batchAiLoading}
                      onClick={() => optimizeProduct(product)}
                    >
                      {isOptimizing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                      {hasSeo ? 'Re-optimizar' : 'Optimizar'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: REDIRECTS ────────────────────────────────────────────── */}
        <TabsContent value="redirects" className="space-y-4">
          {/* Info */}
          <Card className="border-primary/20 bg-primary/3">
            <CardContent className="p-4 flex gap-3">
              <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p><strong className="text-foreground">Wildcard:</strong> <code className="bg-muted px-1 rounded">/blog/*</code> redirige cualquier sub-ruta. El <code>*</code> se propaga al destino.</p>
                <p><strong className="text-foreground">Parámetros:</strong> <code className="bg-muted px-1 rounded">/old/:slug</code> captura un segmento y lo sustituye en <code>/new/:slug</code>.</p>
                <p><strong className="text-foreground">Prioridad:</strong> número mayor = se evalúa primero. Los redirects automáticos (slug rename) usan prioridad 10.</p>
              </div>
            </CardContent>
          </Card>

          {/* Create form */}
          <Card className="p-4">
            <p className="text-sm font-medium mb-3">Crear redirect</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input value={newRedirect.from_path} onChange={(e) => setNewRedirect((r) => ({ ...r, from_path: e.target.value }))}
                placeholder="/ruta-antigua" className="sm:col-span-1" />
              <Input value={newRedirect.to_path} onChange={(e) => setNewRedirect((r) => ({ ...r, to_path: e.target.value }))}
                placeholder="/ruta-nueva" className="sm:col-span-1" />
              <select value={newRedirect.status_code}
                onChange={(e) => setNewRedirect((r) => ({ ...r, status_code: Number(e.target.value) }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value={301}>301 — Permanente</option>
                <option value={302}>302 — Temporal</option>
              </select>
              <Button onClick={addRedirect} disabled={addingRedirect} className="gap-2">
                {addingRedirect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Agregar
              </Button>
            </div>
          </Card>

          {/* List */}
          {loadingRedirects ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : redirects.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin redirects configurados.</p>
          ) : (
            <div className="space-y-2">
              {redirects.map((r) => (
                <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${r.is_active ? 'border-border' : 'border-border/40 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs text-foreground">{r.from_path}</code>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs text-primary">{r.to_path}</code>
                      <Badge variant="outline" className="text-[9px]">{r.status_code}</Badge>
                      {r.is_wildcard && <Badge variant="secondary" className="text-[9px]">wildcard</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {r.hit_count} hits {r.last_hit_at ? `· último: ${new Date(r.last_hit_at).toLocaleDateString('es-MX')}` : '· sin hits aún'}
                    </p>
                  </div>
                  <Switch checked={r.is_active} onCheckedChange={() => toggleRedirect(r.id, r.is_active)} />
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={() => deleteRedirect(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: TÉCNICO ──────────────────────────────────────────────── */}
        <TabsContent value="technical" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Global controls */}
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-sm">Configuración global</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Switch
                    checked={globalSettings.sitemap_enabled}
                    onCheckedChange={(v) => saveGlobal('sitemap_enabled', v)}
                    disabled={savingGlobal}
                  />
                  <div>
                    <Label className="cursor-pointer">Sitemap automático</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Genera <code>/sitemap.xml</code> dinámico con páginas, productos y blogs.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Switch
                    checked={!globalSettings.robots_noindex}
                    onCheckedChange={(v) => saveGlobal('robots_noindex', !v)}
                    disabled={savingGlobal}
                  />
                  <div>
                    <Label className="cursor-pointer">Indexación activa</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si está OFF, <code>robots.txt</code> bloquea todos los crawlers (modo mantenimiento).
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Estado de componentes SEO</h3>
              {[
                { label: 'ProductJsonLd (schema.org)', ok: true, detail: 'Activo en /producto/:slug' },
                { label: 'useSeoMeta hook', ok: true, detail: 'Aplica meta tags por ruta en runtime' },
                { label: 'Hreflang multi-dominio', ok: true, detail: 'waxapp.mx ↔ vapewax.com.mx ↔ extraccionwax.com' },
                { label: 'Redirect handler', ok: true, detail: 'SPA redirects con wildcard y `:param`' },
              ].map(({ label, ok, detail }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${ok ? 'text-green-400' : 'text-red-400'}`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Links */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Archivos generados dinámicamente</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Sitemap XML', path: '/sitemap.xml', desc: 'Páginas, productos y blogs para Google Search Console' },
                { label: 'Robots.txt', path: '/robots.txt', desc: 'Reglas de indexación para crawlers' },
              ].map(({ label, path, desc }) => (
                <a key={path} href={path} target="_blank" rel="noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-all">
                  <ExternalLink className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                    <code className="text-[10px] text-primary">{path}</code>
                  </div>
                </a>
              ))}
            </div>
          </Card>

          <Card className="border-primary/20 bg-primary/3 p-4">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Google Search Console:</strong> Sube tu sitemap en <code>search.google.com/search-console</code> para monitorear indexación, clicks e impresiones.</p>
                <p><strong className="text-foreground">Schema.org:</strong> Los productos tienen JSON-LD automático. Valida en <code>search.google.com/test/rich-results</code>.</p>
                <p><strong className="text-foreground">Tip #1:</strong> Asegúrate de que cada producto tenga descripción, imagen y slug. El score SEO mejora inmediatamente.</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SeoSection;

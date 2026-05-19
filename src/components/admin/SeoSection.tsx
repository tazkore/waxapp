import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Rocket,
  Plus,
  Globe,
  Search,
  ExternalLink,
  Save,
  Loader2,
  X,
  FileText,
  Image,
  Settings2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
  Power,
  Link2,
  Bot,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

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
  created_at: string;
  updated_at: string;
}

interface SeoRedirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  reason: string | null;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  is_wildcard: boolean;
  priority: number;
}

const SeoSection = () => {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<SeoPage | null>(null);
  const [editData, setEditData] = useState({
    page_path: '',
    page_title: '',
    meta_title: '',
    meta_description: '',
    keywords: [] as string[],
    og_image_url: '',
    is_indexed: true,
    auto_sitemap: true,
    canonical_url: '',
  });
  const [deleting, setDeleting] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [globalSitemap, setGlobalSitemap] = useState(true);
  const [globalRobots, setGlobalRobots] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_path: '', page_title: '' });
  const [creating, setCreating] = useState(false);
  const [redirects, setRedirects] = useState<SeoRedirect[]>([]);
  const [newRedirect, setNewRedirect] = useState({ from_path: '', to_path: '', is_wildcard: false, priority: 0 });
  const [addingRedirect, setAddingRedirect] = useState(false);
  const { toast } = useToast();

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seo_pages')
      .select('*')
      .order('page_path');
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las páginas SEO.', variant: 'destructive' });
    } else {
      setPages((data as unknown as SeoPage[]) || []);
    }
    setLoading(false);
  };

  const fetchRedirects = async () => {
    const { data } = await supabase
      .from('seo_redirects' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setRedirects(((data as unknown) as SeoRedirect[]) || []);
  };

  useEffect(() => { fetchPages(); fetchRedirects(); }, []);

  useEffect(() => {
    getSetting('seo_global', { sitemap_enabled: true, robots_noindex: true })
      .then((v) => {
        setGlobalSitemap(v.sitemap_enabled ?? true);
        setGlobalRobots(v.robots_noindex ?? true);
      })
      .catch(() => {});
  }, []);

  const selectPage = (page: SeoPage) => {
    setSelectedPage(page);
    setEditData({
      page_path: page.page_path,
      page_title: page.page_title,
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      keywords: page.keywords || [],
      og_image_url: page.og_image_url || '',
      is_indexed: page.is_indexed,
      auto_sitemap: page.auto_sitemap,
      canonical_url: page.canonical_url || '',
    });
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    if (!editData.page_path.trim() || !editData.page_title.trim()) {
      toast({ title: 'Error', description: 'La ruta (slug) y el título son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('seo_pages')
      .update({
        page_path: editData.page_path.trim(),
        page_title: editData.page_title.trim(),
        meta_title: editData.meta_title || null,
        meta_description: editData.meta_description || null,
        keywords: editData.keywords,
        og_image_url: editData.og_image_url || null,
        is_indexed: editData.is_indexed,
        auto_sitemap: editData.auto_sitemap,
        canonical_url: editData.canonical_url || null,
      } as any)
      .eq('id', selectedPage.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const slugChanged = selectedPage.page_path !== editData.page_path.trim();
      toast({
        title: 'Guardado',
        description: slugChanged
          ? `Slug actualizado. Se creó un redirect 301 de ${selectedPage.page_path} → ${editData.page_path.trim()} automáticamente.`
          : `SEO de "${editData.page_title}" actualizado.`,
      });
      fetchPages();
      if (slugChanged) fetchRedirects();
    }
    setSaving(false);
  };

  const handleAddRedirect = async () => {
    const from = newRedirect.from_path.trim();
    const to = newRedirect.to_path.trim();
    if (!from || !to || !from.startsWith('/') || !to.startsWith('/')) {
      toast({ title: 'Error', description: 'Las rutas deben iniciar con "/".', variant: 'destructive' });
      return;
    }
    if (from === to) {
      toast({ title: 'Error', description: 'Las rutas origen y destino no pueden ser iguales.', variant: 'destructive' });
      return;
    }
    // Si el patrón contiene * o :param, marcar como wildcard automáticamente
    const looksWildcard = /\*/.test(from) || /:[A-Za-z_]/.test(from);
    const isWildcard = newRedirect.is_wildcard || looksWildcard;

    setAddingRedirect(true);
    const { error } = await supabase.from('seo_redirects' as any).insert({
      from_path: from,
      to_path: to,
      status_code: 301,
      is_active: true,
      reason: isWildcard ? 'Manual (wildcard)' : 'Manual',
      is_wildcard: isWildcard,
      priority: newRedirect.priority || 0,
    } as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Redirect creado', description: `${from} → ${to}${isWildcard ? ' (wildcard)' : ''}` });
      setNewRedirect({ from_path: '', to_path: '', is_wildcard: false, priority: 0 });
      fetchRedirects();
    }
    setAddingRedirect(false);
  };

  const toggleRedirect = async (r: SeoRedirect) => {
    await supabase.from('seo_redirects' as any).update({ is_active: !r.is_active } as any).eq('id', r.id);
    fetchRedirects();
  };

  const deleteRedirect = async (r: SeoRedirect) => {
    if (!confirm(`¿Eliminar el redirect ${r.from_path} → ${r.to_path}?`)) return;
    await supabase.from('seo_redirects' as any).delete().eq('id', r.id);
    fetchRedirects();
  };

  const handleDelete = async () => {
    if (!selectedPage) return;
    if (!confirm(`¿Eliminar la página SEO "${selectedPage.page_title}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const { error } = await supabase.from('seo_pages').delete().eq('id', selectedPage.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Eliminada', description: 'Página SEO eliminada.' });
      setSelectedPage(null);
      fetchPages();
    }
    setDeleting(false);
  };

  const handleCreatePage = async () => {
    if (!newPage.page_path.trim() || !newPage.page_title.trim()) {
      toast({ title: 'Error', description: 'Ruta y título son obligatorios.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('seo_pages').insert({
      page_path: newPage.page_path.trim(),
      page_title: newPage.page_title.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Página creada', description: `"${newPage.page_title}" agregada.` });
      setCreateOpen(false);
      setNewPage({ page_path: '', page_title: '' });
      fetchPages();
    }
    setCreating(false);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !editData.keywords.includes(kw)) {
      setEditData({ ...editData, keywords: [...editData.keywords, kw] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setEditData({ ...editData, keywords: editData.keywords.filter((k) => k !== kw) });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
  };

  // Health score calculation
  const calculateHealth = () => {
    if (pages.length === 0) return 0;
    let score = 0;
    let total = 0;
    pages.forEach((p) => {
      total += 4;
      if (p.meta_title && p.meta_title.length <= 60) score++;
      if (p.meta_description && p.meta_description.length <= 160) score++;
      if ((p.keywords ?? []).length > 0) score++;
      if (p.is_indexed) score++;
    });
    return Math.round((score / total) * 100);
  };

  const healthScore = calculateHealth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const metaTitleLen = (editData.meta_title ?? '').length;
  const metaDescLen = (editData.meta_description ?? '').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> SEO & Indexación
          </h1>
          <p className="text-muted-foreground text-sm">Control total sobre cómo los motores de búsqueda ven tu tienda.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Crear Página
        </Button>
      </div>

      {/* Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${healthScore >= 80 ? 'bg-primary/20' : healthScore >= 50 ? 'bg-amber-500/20' : 'bg-destructive/20'}`}>
                  {healthScore >= 80 ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <AlertCircle className={`h-6 w-6 ${healthScore >= 50 ? 'text-amber-400' : 'text-destructive'}`} />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Salud del Sitio: {healthScore}% Optimizado</h2>
                  <p className="text-xs text-muted-foreground">{pages.length} páginas analizadas</p>
                </div>
              </div>
            </div>
            <Progress value={healthScore} className="h-3" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pages List */}
        <div className="xl:col-span-1 space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
            <Globe className="h-4 w-4" /> Páginas ({pages.length})
          </h3>
          <div className="space-y-1">
            {pages.map((page) => {
              const isSelected = selectedPage?.id === page.id;
              const hasIssues = !page.meta_title || !page.meta_description || page.keywords.length === 0;
              return (
                <motion.button
                  key={page.id}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                  onClick={() => selectPage(page)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{page.page_title}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{page.page_path}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {hasIssues && <AlertCircle className="h-3.5 w-3.5 text-accent" />}
                      {page.is_indexed ? (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Indexada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">No-index</Badge>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="xl:col-span-2">
          {selectedPage ? (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} key={selectedPage.id}>
              <Card className="border-border bg-card">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground truncate">{selectedPage.page_title}</h3>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive border-destructive/30" onClick={handleDelete} disabled={deleting || saving}>
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Eliminar
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Guardar
                      </Button>
                    </div>
                  </div>

                  {/* Identidad de la página: título y slug editables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <Label className="text-xs mb-1 block">Título de la Página</Label>
                      <Input
                        value={editData.page_title}
                        onChange={(e) => setEditData({ ...editData, page_title: e.target.value })}
                        placeholder="Mi página"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Nombre interno mostrado en el panel.</p>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Slug / Ruta (page_path)</Label>
                      <Input
                        value={editData.page_path}
                        onChange={(e) => setEditData({ ...editData, page_path: e.target.value })}
                        placeholder="/mi-pagina"
                        className="font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Debe iniciar con "/". Coincide con la ruta del frontend.</p>
                      {selectedPage.page_path !== editData.page_path && editData.page_path.trim() && (
                        <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-primary/10 border border-primary/30">
                          <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <p className="text-[11px] text-foreground">
                            Al guardar se creará un <strong>redirect 301</strong> automático:{' '}
                            <span className="font-mono text-primary">{selectedPage.page_path}</span> →{' '}
                            <span className="font-mono text-primary">{editData.page_path}</span> para preservar el SEO.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Tabs defaultValue="meta">
                    <TabsList>
                      <TabsTrigger value="meta" className="gap-1.5 text-xs">
                        <FileText className="h-3.5 w-3.5" /> Meta Tags
                      </TabsTrigger>
                      <TabsTrigger value="og" className="gap-1.5 text-xs">
                        <Image className="h-3.5 w-3.5" /> OpenGraph
                      </TabsTrigger>
                      <TabsTrigger value="tech" className="gap-1.5 text-xs">
                        <Settings2 className="h-3.5 w-3.5" /> Técnico
                      </TabsTrigger>
                    </TabsList>

                    {/* Meta Tags Tab */}
                    <TabsContent value="meta" className="mt-4 space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Inputs */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs">Meta Título (Max 60 caracteres)</Label>
                              <span className={`text-[10px] font-mono ${metaTitleLen > 60 ? 'text-destructive' : metaTitleLen > 50 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                {metaTitleLen}/60
                              </span>
                            </div>
                            <Input
                              value={editData.meta_title}
                              onChange={(e) => setEditData({ ...editData, meta_title: e.target.value })}
                              placeholder="Título optimizado para SEO..."
                              className={metaTitleLen > 60 ? 'border-destructive' : ''}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs">Meta Descripción (Max 160 caracteres)</Label>
                              <span className={`text-[10px] font-mono ${metaDescLen > 160 ? 'text-destructive' : metaDescLen > 140 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                {metaDescLen}/160
                              </span>
                            </div>
                            <Textarea
                              value={editData.meta_description}
                              onChange={(e) => setEditData({ ...editData, meta_description: e.target.value })}
                              placeholder="Descripción atractiva para resultados de búsqueda..."
                              rows={3}
                              className={metaDescLen > 160 ? 'border-destructive' : ''}
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Keywords de Enfoque</Label>
                            <div className="flex gap-2">
                              <Input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={handleKeywordKeyDown}
                                placeholder="Escribe y presiona Enter..."
                                className="flex-1"
                              />
                              <Button variant="outline" size="sm" onClick={addKeyword}>+</Button>
                            </div>
                            {editData.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {editData.keywords.map((kw) => (
                                  <Badge
                                    key={kw}
                                    variant="secondary"
                                    className="text-xs gap-1 cursor-pointer hover:bg-destructive/20"
                                    onClick={() => removeKeyword(kw)}
                                  >
                                    {kw} <X className="h-3 w-3" />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Live Preview */}
                        <div>
                          <Label className="text-xs mb-2 block">Previsualización en Google</Label>
                          <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                            <p className="text-sm text-primary hover:underline cursor-pointer leading-tight font-medium">
                              {editData.meta_title || 'Título de la página'}
                            </p>
                            <p className="text-xs text-primary/60 font-mono">
                              {typeof window !== 'undefined' ? window.location.hostname : 'waxapp.mx'}{selectedPage.page_path}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {editData.meta_description || 'Agrega una meta descripción para ver cómo aparecerá en los resultados de búsqueda.'}
                            </p>
                          </div>
                          {editData.keywords.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-muted-foreground mb-1">Keywords objetivo:</p>
                              <div className="flex flex-wrap gap-1">
                                {editData.keywords.map((kw) => (
                                  <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* OpenGraph Tab */}
                    <TabsContent value="og" className="mt-4 space-y-4">
                      <div>
                        <Label className="text-xs">Imagen OpenGraph (URL)</Label>
                        <Input
                          value={editData.og_image_url}
                          onChange={(e) => setEditData({ ...editData, og_image_url: e.target.value })}
                          placeholder="https://..."
                          className="mt-1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Imagen que aparecerá al compartir en WhatsApp, Twitter y Facebook. Tamaño recomendado: 1200x630px.
                        </p>
                      </div>
                      {editData.og_image_url && (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <img
                            src={editData.og_image_url}
                            alt="OG Preview"
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="p-3 bg-card">
                            <p className="text-[10px] text-muted-foreground uppercase">{typeof window !== 'undefined' ? window.location.hostname : 'waxapp.mx'}</p>
                            <p className="text-sm font-medium text-foreground">{editData.meta_title || selectedPage.page_title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{editData.meta_description}</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Technical Tab */}
                    <TabsContent value="tech" className="mt-4 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">Permitir indexación</p>
                          <p className="text-[11px] text-muted-foreground">Permitir que Google indexe esta página</p>
                        </div>
                        <Switch
                          checked={editData.is_indexed}
                          onCheckedChange={(v) => setEditData({ ...editData, is_indexed: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">Incluir en Sitemap</p>
                          <p className="text-[11px] text-muted-foreground">Agregar automáticamente al sitemap.xml</p>
                        </div>
                        <Switch
                          checked={editData.auto_sitemap}
                          onCheckedChange={(v) => setEditData({ ...editData, auto_sitemap: v })}
                        />
                      </div>
                      <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                        <Label className="text-xs">URL Canónica (opcional)</Label>
                        <Input
                          value={editData.canonical_url}
                          onChange={(e) => setEditData({ ...editData, canonical_url: e.target.value })}
                          placeholder="https://waxapp.mx/..."
                          className="bg-background"
                        />
                        <p className="text-[10px] text-muted-foreground">Dejar vacío para usar la URL actual de la página.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="py-20 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecciona una página de la lista para editar su SEO.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Global Technical Controls */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4" /> Herramientas Técnicas Globales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-Generar Sitemap.xml</p>
                <p className="text-[11px] text-muted-foreground">Genera automáticamente el sitemap con todas las páginas indexadas</p>
              </div>
              <Switch
                checked={globalSitemap}
                onCheckedChange={async (v) => {
                  setGlobalSitemap(v);
                  const { error } = await setSetting('seo_global', { sitemap_enabled: v, robots_noindex: globalRobots });
                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                  else toast({ title: 'Guardado', description: `Sitemap ${v ? 'activado' : 'desactivado'}` });
                }}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">Indexar en Google (robots.txt)</p>
                <p className="text-[11px] text-muted-foreground">Permitir/Bloquear el rastreo de bots en todo el sitio</p>
              </div>
              <Switch
                checked={globalRobots}
                onCheckedChange={async (v) => {
                  setGlobalRobots(v);
                  const { error } = await setSetting('seo_global', { sitemap_enabled: globalSitemap, robots_noindex: v });
                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                  else toast({ title: 'Guardado', description: `Indexación ${v ? 'habilitada' : 'bloqueada'}` });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sitemap & Robots Links */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4" /> Archivos de Indexación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
            >
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">sitemap.xml</p>
                <p className="text-[11px] text-muted-foreground">Generado dinámicamente con todos los productos y páginas</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
            >
              <Bot className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">robots.txt</p>
                <p className="text-[11px] text-muted-foreground">Controla el acceso de bots a secciones del sitio</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Google Search Console: agrega <code className="font-mono bg-muted px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'https://waxapp.mx'}/sitemap.xml</code> para acelerar la indexación.
          </p>
        </CardContent>
      </Card>

      {/* Redirects 301 Manager */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" /> Redirects 301
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Se crean automáticamente al renombrar el slug de una página. También puedes añadirlos manualmente.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">{redirects.length} configurados</Badge>
          </div>

          <div className="space-y-2 mb-4 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-[10px] mb-1 block">Desde (ruta antigua o patrón)</Label>
                <Input
                  value={newRedirect.from_path}
                  onChange={(e) => setNewRedirect({ ...newRedirect, from_path: e.target.value })}
                  placeholder="/ruta-vieja  ó  /old/*  ó  /blog/:slug"
                  className="font-mono text-xs"
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground self-center mb-2 hidden md:block" />
              <div>
                <Label className="text-[10px] mb-1 block">Hacia (ruta nueva)</Label>
                <Input
                  value={newRedirect.to_path}
                  onChange={(e) => setNewRedirect({ ...newRedirect, to_path: e.target.value })}
                  placeholder="/ruta-nueva  ó  /new/*  ó  /articulos/:slug"
                  className="font-mono text-xs"
                />
              </div>
              <Button size="sm" onClick={handleAddRedirect} disabled={addingRedirect}>
                {addingRedirect ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Añadir
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRedirect.is_wildcard || /\*/.test(newRedirect.from_path) || /:[A-Za-z_]/.test(newRedirect.from_path)}
                  onCheckedChange={(v) => setNewRedirect({ ...newRedirect, is_wildcard: v })}
                />
                <Label className="text-[11px]">Wildcard / parámetros</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground">Prioridad</Label>
                <Input
                  type="number"
                  value={newRedirect.priority}
                  onChange={(e) => setNewRedirect({ ...newRedirect, priority: parseInt(e.target.value) || 0 })}
                  className="w-20 h-8 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground basis-full">
                Sintaxis: <code className="font-mono">/old/*</code> captura todo lo que sigue (usa <code>*</code> en destino).{' '}
                <code className="font-mono">/blog/:slug</code> captura un segmento (usa <code>:slug</code> en destino).
                Mayor prioridad = se evalúa primero.
              </p>
            </div>
          </div>

          {redirects.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No hay redirects configurados.</p>
          ) : (
            <div className="space-y-1.5">
              {redirects.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 p-2.5 rounded-md border ${
                    r.is_active ? 'border-border bg-background' : 'border-border bg-muted/20 opacity-60'
                  }`}
                >
                  <Badge variant="outline" className="text-[9px] shrink-0">{r.status_code}</Badge>
                  {r.is_wildcard && (
                    <Badge variant="outline" className="text-[9px] shrink-0 border-primary/40 text-primary">wildcard</Badge>
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2 text-xs font-mono">
                    <span className="text-muted-foreground truncate">{r.from_path}</span>
                    <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-foreground truncate">{r.to_path}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{r.hit_count} hits</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleRedirect(r)} title={r.is_active ? 'Desactivar' : 'Activar'}>
                    <Power className={`h-3.5 w-3.5 ${r.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRedirect(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Page Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="text-foreground">Crear Página SEO</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Ruta *</Label>
              <Input className="bg-muted border-border" value={newPage.page_path} onChange={e => setNewPage({ ...newPage, page_path: e.target.value })} placeholder="/mi-nueva-pagina" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Título *</Label>
              <Input className="bg-muted border-border" value={newPage.page_title} onChange={e => setNewPage({ ...newPage, page_title: e.target.value })} placeholder="Mi Nueva Página" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreatePage} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoSection;

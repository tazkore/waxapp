import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Plus, Edit, Trash2, Loader2, Eye, ArrowLeft,
  CheckCircle2, AlertCircle, BarChart3, Globe, FileText,
  X, Save, RefreshCw, ListFilter, Layers,
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  author: string;
  category: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[];
  og_image_url: string | null;
  status: string;
  published_at: string | null;
  views: number;
  created_at: string;
}

interface BatchItem {
  id: string;
  topic: string;
  category: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  error?: string;
  result?: Partial<BlogPost>;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'cbd', label: 'CBD' },
  { value: 'thc', label: 'THC' },
  { value: 'edibles', label: 'Edibles' },
  { value: 'nano', label: 'Nano Tecnología' },
  { value: 'guias', label: 'Guías' },
  { value: 'noticias', label: 'Noticias' },
];

const empty: Partial<BlogPost> = {
  slug: '', title: '', excerpt: '', content: '', cover_image_url: '',
  author: 'WAXAPP Team', category: 'general',
  meta_title: '', meta_description: '', keywords: [], og_image_url: '', status: 'draft',
};

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);

// ─── SEO Score ───────────────────────────────────────────────────────
const calcSeoScore = (p: Partial<BlogPost>): { score: number; issues: string[]; passes: string[] } => {
  const issues: string[] = [];
  const passes: string[] = [];
  let score = 0;

  const titleLen = (p.meta_title || '').length;
  if (titleLen >= 30 && titleLen <= 60) { score += 20; passes.push('Meta título óptimo'); }
  else issues.push(titleLen === 0 ? 'Falta meta título' : `Meta título ${titleLen < 30 ? 'muy corto' : 'muy largo'} (${titleLen}/60)`);

  const descLen = (p.meta_description || '').length;
  if (descLen >= 80 && descLen <= 160) { score += 20; passes.push('Meta descripción óptima'); }
  else issues.push(descLen === 0 ? 'Falta meta descripción' : `Meta descripción ${descLen < 80 ? 'muy corta' : 'muy larga'} (${descLen}/160)`);

  const words = (p.content || '').split(/\s+/).filter(Boolean).length;
  if (words >= 800) { score += 20; passes.push(`Contenido extenso (${words} palabras)`); }
  else if (words >= 400) { score += 10; passes.push(`Contenido aceptable (${words} palabras)`); }
  else issues.push(`Contenido corto (${words} palabras, recomendado 800+)`);

  if ((p.keywords || []).length >= 3) { score += 20; passes.push(`${p.keywords!.length} keywords definidas`); }
  else issues.push(`Pocas keywords (${(p.keywords || []).length}, recomendado 3+)`);

  if (p.cover_image_url) { score += 10; passes.push('Imagen de portada'); }
  else issues.push('Sin imagen de portada');

  if (p.og_image_url) { score += 10; passes.push('OG Image configurada'); }
  else issues.push('Sin OG Image');

  return { score: Math.min(100, score), issues, passes };
};

const SeoScoreCard = ({ post }: { post: Partial<BlogPost> }) => {
  const { score, issues, passes } = calcSeoScore(post);
  const color = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-400' : 'text-destructive';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-black ${color}`}>{score}</div>
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground mb-1">Score SEO</p>
          <Progress value={score} className="h-2" />
        </div>
      </div>
      <div className="space-y-1">
        {passes.map(p => (
          <div key={p} className="flex items-center gap-2 text-xs text-green-500">
            <CheckCircle2 className="h-3 w-3 shrink-0" /> {p}
          </div>
        ))}
        {issues.map(i => (
          <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" /> {i}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Full-page Editor ────────────────────────────────────────────────
const PostEditor = ({
  post,
  onSave,
  onBack,
}: {
  post: Partial<BlogPost>;
  onSave: (p: Partial<BlogPost>) => Promise<void>;
  onBack: () => void;
}) => {
  const [editing, setEditing] = useState<Partial<BlogPost>>(post);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'preview'>('content');

  const update = (patch: Partial<BlogPost>) => setEditing(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(editing);
    setSaving(false);
  };

  const wordCount = (editing.content || '').split(/\s+/).filter(Boolean).length;
  const metaTitleLen = (editing.meta_title || '').length;
  const metaDescLen = (editing.meta_description || '').length;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <h2 className="text-sm font-semibold text-foreground flex-1 truncate">
          {editing.id ? editing.title || 'Artículo sin título' : 'Nuevo artículo'}
        </h2>
        <div className="flex items-center gap-2">
          <Switch
            checked={editing.status === 'published'}
            onCheckedChange={c => update({ status: c ? 'published' : 'draft' })}
          />
          <span className="text-xs text-muted-foreground">{editing.status === 'published' ? 'Publicado' : 'Borrador'}</span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        {/* Main editor */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="content"><FileText className="h-3.5 w-3.5 mr-1.5" />Contenido</TabsTrigger>
              <TabsTrigger value="seo"><Globe className="h-3.5 w-3.5 mr-1.5" />SEO</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1.5" />Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs mb-1 block">Título</Label>
                <Input
                  value={editing.title ?? ''}
                  onChange={e => update({ title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                  placeholder="Título del artículo..."
                  className="text-base font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Slug (URL)</Label>
                  <Input
                    value={editing.slug ?? ''}
                    onChange={e => update({ slug: slugify(e.target.value) })}
                    className="font-mono text-xs"
                    placeholder="mi-articulo"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Categoría</Label>
                  <Select value={editing.category ?? 'general'} onValueChange={v => update({ category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Autor</Label>
                  <Input value={editing.author ?? ''} onChange={e => update({ author: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Imagen de portada (URL)</Label>
                  <Input value={editing.cover_image_url ?? ''} onChange={e => update({ cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Extracto</Label>
                <Textarea rows={2} value={editing.excerpt ?? ''} onChange={e => update({ excerpt: e.target.value })} placeholder="Breve descripción..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Contenido (Markdown)</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">{wordCount} palabras</span>
                </div>
                <Textarea
                  rows={20}
                  className="font-mono text-sm resize-y"
                  value={editing.content ?? ''}
                  onChange={e => update({ content: e.target.value })}
                  placeholder="# Título&#10;&#10;Escribe aquí el contenido en Markdown..."
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Meta Título (30–60 caracteres)</Label>
                  <span className={`text-[10px] font-mono ${metaTitleLen > 60 ? 'text-destructive' : metaTitleLen > 50 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {metaTitleLen}/60
                  </span>
                </div>
                <Input
                  value={editing.meta_title ?? ''}
                  onChange={e => update({ meta_title: e.target.value })}
                  placeholder="Título optimizado para buscadores..."
                  className={metaTitleLen > 60 ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Meta Descripción (80–160 caracteres)</Label>
                  <span className={`text-[10px] font-mono ${metaDescLen > 160 ? 'text-destructive' : metaDescLen > 140 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {metaDescLen}/160
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={editing.meta_description ?? ''}
                  onChange={e => update({ meta_description: e.target.value })}
                  placeholder="Descripción que aparece en los resultados de búsqueda..."
                  className={metaDescLen > 160 ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Keywords (separadas por coma)</Label>
                <Input
                  value={(editing.keywords ?? []).join(', ')}
                  onChange={e => update({ keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="CBD, vapes, nanotecnología, bienestar"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">OG Image URL</Label>
                <Input value={editing.og_image_url ?? ''} onChange={e => update({ og_image_url: e.target.value })} placeholder="https://..." />
              </div>
              {/* Google SERP preview */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Previsualización en Google</p>
                <p className="text-sm text-blue-500 hover:underline cursor-pointer leading-tight font-medium">
                  {editing.meta_title || editing.title || 'Título del artículo'}
                </p>
                <p className="text-xs text-green-700 dark:text-green-500 font-mono">
                  {typeof window !== 'undefined' ? window.location.hostname : 'waxapp.mx'}/blog/{editing.slug || 'slug'}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {editing.meta_description || 'Agrega una meta descripción para ver la previsualización.'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {editing.cover_image_url && (
                <img src={editing.cover_image_url} alt="" className="w-full h-48 object-cover rounded-lg mb-6" />
              )}
              <article className="prose prose-invert max-w-none">
                <h1>{editing.title || 'Sin título'}</h1>
                {editing.excerpt && <p className="lead">{editing.excerpt}</p>}
                <ReactMarkdown>{editing.content ?? ''}</ReactMarkdown>
              </article>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: SEO Score */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" /> Score SEO
              </p>
              <SeoScoreCard post={editing} />
            </CardContent>
          </Card>
          {editing.id && editing.status === 'published' && (
            <a href={`/blog/${editing.slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Eye className="h-3.5 w-3.5" /> Ver publicado
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Batch AI Generator ──────────────────────────────────────────────
const BatchGenerator = ({ onDone }: { onDone: () => void }) => {
  const [items, setItems] = useState<BatchItem[]>([
    { id: '1', topic: '', category: 'general', status: 'pending' },
  ]);
  const [running, setRunning] = useState(false);
  const [generateImage, setGenerateImage] = useState(false);

  const addItem = () => {
    if (items.length >= 10) return;
    setItems(prev => [...prev, { id: Date.now().toString(), topic: '', category: 'general', status: 'pending' }]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, patch: Partial<BatchItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const runBatch = async () => {
    const ready = items.filter(i => i.topic.trim());
    if (ready.length === 0) { toast.error('Ingresa al menos un tema'); return; }
    setRunning(true);

    for (const item of ready) {
      updateItem(item.id, { status: 'generating' });
      try {
        const { data, error } = await supabase.functions.invoke('generate-blog-post', {
          body: { topic: item.topic, category: item.category, generateImage },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Save to DB
        const payload: any = {
          ...data,
          status: 'draft',
          published_at: null,
        };
        const { error: insertErr } = await supabase.from('blog_posts').insert(payload);
        if (insertErr) throw insertErr;

        updateItem(item.id, { status: 'done', result: data });
      } catch (e: any) {
        updateItem(item.id, { status: 'error', error: e.message ?? 'Error desconocido' });
      }
    }

    setRunning(false);
    const doneCount = items.filter(i => i.status === 'done').length;
    if (doneCount > 0) toast.success(`${doneCount} artículos generados y guardados como borrador`);
  };

  const allDone = items.every(i => i.status === 'done' || i.status === 'error');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <Layers className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Generación en lote con IA</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agrega hasta 10 temas y genera todos los artículos SEO de una sola vez. Se guardan como borrador para que los revises antes de publicar.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card"
          >
            <span className="text-[11px] text-muted-foreground font-mono w-5 shrink-0">{idx + 1}</span>
            <Input
              value={item.topic}
              onChange={e => updateItem(item.id, { topic: e.target.value })}
              placeholder="Ej: Beneficios del CBD para el sueño"
              disabled={item.status !== 'pending' || running}
              className="flex-1"
            />
            <Select value={item.category} onValueChange={v => updateItem(item.id, { category: v })} disabled={item.status !== 'pending' || running}>
              <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="w-24 shrink-0 flex items-center justify-center">
              {item.status === 'pending' && <span className="text-[10px] text-muted-foreground">Pendiente</span>}
              {item.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {item.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {item.status === 'error' && (
                <span className="text-[10px] text-destructive truncate" title={item.error}>Error</span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 hover:text-destructive"
              onClick={() => removeItem(item.id)}
              disabled={running || items.length <= 1}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={items.length >= 10 || running}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar tema ({items.length}/10)
          </Button>
          <div className="flex items-center gap-2">
            <Switch checked={generateImage} onCheckedChange={setGenerateImage} disabled={running} />
            <Label className="text-xs">Generar imágenes</Label>
            <span className="text-[10px] text-amber-400">(más lento)</span>
          </div>
        </div>
        <div className="flex gap-2">
          {allDone && (
            <Button variant="outline" size="sm" onClick={onDone} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Ver artículos generados
            </Button>
          )}
          <Button
            onClick={runBatch}
            disabled={running || items.every(i => !i.topic.trim())}
            className="gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? `Generando…` : `Generar ${items.filter(i => i.topic.trim()).length} artículo(s)`}
          </Button>
        </div>
      </div>

      {items.some(i => i.status === 'error') && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          {items.filter(i => i.status === 'error').map(i => (
            <p key={i.id} className="text-xs text-destructive">
              <strong>"{i.topic}":</strong> {i.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Blog Section ───────────────────────────────────────────────
type View = 'list' | 'editor' | 'batch';

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editingPost, setEditingPost] = useState<Partial<BlogPost>>(empty);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error cargando posts');
    setPosts((data as BlogPost[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const openNew = () => { setEditingPost({ ...empty }); setView('editor'); };
  const openEdit = (p: BlogPost) => { setEditingPost(p); setView('editor'); };

  const savePost = async (editing: Partial<BlogPost>) => {
    if (!editing.title || !editing.slug) { toast.error('Título y slug requeridos'); return; }
    const payload: any = {
      slug: editing.slug,
      title: editing.title,
      excerpt: editing.excerpt || null,
      content: editing.content || '',
      cover_image_url: editing.cover_image_url || null,
      author: editing.author || 'WAXAPP Team',
      category: editing.category || 'general',
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      keywords: editing.keywords || [],
      og_image_url: editing.og_image_url || null,
      status: editing.status || 'draft',
      published_at: editing.status === 'published' ? (editing.published_at || new Date().toISOString()) : null,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from('blog_posts').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('blog_posts').insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success('Guardado');
    fetchPosts();
    setView('list');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar artículo?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Eliminado'); fetchPosts(); }
  };

  const filteredPosts = posts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const totalViews = posts.reduce((s, p) => s + p.views, 0);

  // ── Editor view ──
  if (view === 'editor') {
    return (
      <PostEditor
        post={editingPost}
        onSave={savePost}
        onBack={() => setView('list')}
      />
    );
  }

  // ── Batch view ──
  if (view === 'batch') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <h2 className="text-lg font-bold text-foreground">Generación en Lote con IA</h2>
        </div>
        <BatchGenerator onDone={() => { fetchPosts(); setView('list'); }} />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog & Contenido SEO</h1>
          <p className="text-sm text-muted-foreground">Crea artículos optimizados para buscadores con IA.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setView('batch')}
            className="gap-2"
          >
            <Layers className="h-4 w-4" /> Generación en lote
          </Button>
          <Button onClick={openNew} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Nuevo artículo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: posts.length, color: 'text-foreground' },
          { label: 'Publicados', value: publishedCount, color: 'text-green-500' },
          { label: 'Borradores', value: draftCount, color: 'text-amber-400' },
          { label: 'Vistas totales', value: totalViews, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artículo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterStatus === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : 'Borradores'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={fetchPosts} title="Recargar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : filteredPosts.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-20 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Sin resultados para esa búsqueda.' : 'Sin artículos aún.'}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={openNew} variant="outline" size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Nuevo artículo
            </Button>
            <Button onClick={() => setView('batch')} variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Generar con IA
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((p, i) => {
            const { score } = calcSeoScore(p);
            const scoreColor = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-400' : 'text-destructive';
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors group"
              >
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{p.category}</Badge>
                    <Badge className={`text-[9px] ${p.status === 'published' ? 'bg-green-500/15 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {p.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{p.views} vistas</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
                {/* SEO mini score */}
                <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                  <span className={`text-xs font-bold ${scoreColor}`}>{score}</span>
                  <span className="text-[9px] text-muted-foreground">SEO</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {p.status === 'published' && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => remove(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlogSection;

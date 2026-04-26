import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Sparkles, Plus, Edit, Trash2, Loader2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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

const empty: Partial<BlogPost> = {
  slug: '', title: '', excerpt: '', content: '', cover_image_url: '',
  author: 'WAXAPP Team', category: 'general',
  meta_title: '', meta_description: '', keywords: [], og_image_url: '', status: 'draft',
};

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BlogPost>>(empty);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('general');
  const [aiImage, setAiImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error cargando posts');
    setPosts((data as BlogPost[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const openNew = () => { setEditing({ ...empty }); setEditorOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing(p); setEditorOpen(true); };

  const save = async () => {
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
    setEditorOpen(false);
    fetchPosts();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar artículo?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Eliminado'); fetchPosts(); }
  };

  const generateWithAI = async () => {
    if (!aiTopic.trim()) { toast.error('Ingresa un tema'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: { topic: aiTopic, category: aiCategory, generateImage: aiImage },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditing({
        ...empty,
        ...data,
        status: 'draft',
      });
      setAiOpen(false);
      setEditorOpen(true);
      setAiTopic('');
      toast.success('Artículo generado, revisa antes de publicar');
    } catch (e: any) {
      toast.error(e.message ?? 'Error generando');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog</h1>
          <p className="text-sm text-muted-foreground">Crea contenido SEO con IA o manualmente</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAiOpen(true)} className="gap-2 bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" /> Generar con IA
          </Button>
          <Button onClick={openNew} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vistas</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : posts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin artículos aún</TableCell></TableRow>
            ) : posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                <TableCell>
                  <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                    {p.status === 'published' ? 'Publicado' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell>{p.views}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="flex gap-1">
                  {p.status === 'published' && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* AI Modal */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>✨ Generar artículo con IA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tema o palabra clave</Label>
              <Textarea value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ej: Beneficios del CBD nano-emulsionado vs aceite tradicional" rows={3} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={aiCategory} onValueChange={setAiCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="cbd">CBD</SelectItem>
                  <SelectItem value="thc">THC</SelectItem>
                  <SelectItem value="edibles">Edibles</SelectItem>
                  <SelectItem value="nano">Nano Tecnología</SelectItem>
                  <SelectItem value="guias">Guías</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Generar imagen de portada</Label>
                <p className="text-xs text-muted-foreground">Más lento pero queda listo</p>
              </div>
              <Switch checked={aiImage} onCheckedChange={setAiImage} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>Cancelar</Button>
            <Button onClick={generateWithAI} disabled={aiLoading} className="gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Título</Label>
                  <Input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug ?? ''} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoría</Label>
                  <Select value={editing.category ?? 'general'} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="cbd">CBD</SelectItem>
                      <SelectItem value="thc">THC</SelectItem>
                      <SelectItem value="edibles">Edibles</SelectItem>
                      <SelectItem value="nano">Nano</SelectItem>
                      <SelectItem value="guias">Guías</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input value={editing.author ?? ''} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Imagen de portada (URL)</Label>
                <Input value={editing.cover_image_url ?? ''} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
              </div>
              <div>
                <Label>Extracto</Label>
                <Textarea rows={2} value={editing.excerpt ?? ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
              </div>
              <div>
                <Label>Contenido (Markdown)</Label>
                <Textarea rows={14} className="font-mono text-sm" value={editing.content ?? ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label>Publicado</Label>
                <Switch checked={editing.status === 'published'} onCheckedChange={(c) => setEditing({ ...editing, status: c ? 'published' : 'draft' })} />
              </div>
            </TabsContent>
            <TabsContent value="seo" className="space-y-4">
              <div>
                <Label>Meta título (≤60 chars) — {(editing.meta_title ?? '').length}</Label>
                <Input value={editing.meta_title ?? ''} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
              </div>
              <div>
                <Label>Meta descripción (≤155 chars) — {(editing.meta_description ?? '').length}</Label>
                <Textarea rows={3} value={editing.meta_description ?? ''} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
              </div>
              <div>
                <Label>Keywords (separadas por coma)</Label>
                <Input value={(editing.keywords ?? []).join(', ')} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div>
                <Label>OG Image URL</Label>
                <Input value={editing.og_image_url ?? ''} onChange={(e) => setEditing({ ...editing, og_image_url: e.target.value })} />
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <article className="prose prose-invert max-w-none">
                <h1>{editing.title}</h1>
                <ReactMarkdown>{editing.content ?? ''}</ReactMarkdown>
              </article>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogSection;

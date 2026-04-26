import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2, Save, ExternalLink, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomPage {
  id: string;
  slug: string;
  title: string;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  show_in_navbar: boolean;
  blocks: any[];
  updated_at: string;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const ThemePagesSection = () => {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomPage | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('custom_pages').select('*').order('updated_at', { ascending: false });
    setPages((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const newPage = () => setEditing({
    id: '', slug: '', title: '', status: 'draft',
    meta_title: '', meta_description: '', show_in_navbar: false, blocks: [], updated_at: '',
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return toast({ title: 'Falta el título', variant: 'destructive' });
    setSaving(true);
    try {
      const slug = editing.slug.trim() || slugify(editing.title);
      const payload = {
        slug,
        title: editing.title.trim(),
        status: editing.status,
        meta_title: editing.meta_title,
        meta_description: editing.meta_description,
        show_in_navbar: editing.show_in_navbar,
        blocks: editing.blocks ?? [],
      };
      const op = editing.id
        ? supabase.from('custom_pages').update(payload).eq('id', editing.id)
        : supabase.from('custom_pages').insert(payload);
      const { error } = await op;
      if (error) throw error;
      toast({ title: '✅ Página guardada', description: `/${slug}` });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta página?')) return;
    const { error } = await supabase.from('custom_pages').delete().eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Página eliminada' });
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Páginas personalizadas</h3>
          <p className="text-xs text-muted-foreground">Crea páginas adicionales (sobre, contacto, términos...) sin tocar código.</p>
        </div>
        <Button onClick={newPage} className="gap-2"><Plus className="h-4 w-4" /> Nueva página</Button>
      </div>

      {pages.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">Aún no hay páginas personalizadas.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{p.title}</span>
                    <Badge variant={p.status === 'published' ? 'default' : 'outline'}>{p.status}</Badge>
                    {p.show_in_navbar && <Badge variant="secondary" className="text-xs">En menú</Badge>}
                  </div>
                  <code className="text-xs text-muted-foreground">/{p.slug}</code>
                </div>
                <div className="flex gap-1">
                  {p.status === 'published' && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={`/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar página' : 'Nueva página'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">/</span>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    placeholder="se-genera-del-titulo"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <Label>Publicada</Label>
                    <p className="text-xs text-muted-foreground">Visible al público</p>
                  </div>
                  <Switch
                    checked={editing.status === 'published'}
                    onCheckedChange={(v) => setEditing({ ...editing, status: v ? 'published' : 'draft' })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <Label>Mostrar en menú</Label>
                    <p className="text-xs text-muted-foreground">Aparece en Navbar</p>
                  </div>
                  <Switch
                    checked={editing.show_in_navbar}
                    onCheckedChange={(v) => setEditing({ ...editing, show_in_navbar: v })}
                  />
                </div>
              </div>
              <div>
                <Label>Meta título (SEO)</Label>
                <Input value={editing.meta_title ?? ''} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
              </div>
              <div>
                <Label>Meta descripción (SEO)</Label>
                <Textarea
                  value={editing.meta_description ?? ''}
                  onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                💡 El editor visual de bloques (drag &amp; drop) llegará en la <strong>Fase 3</strong>. Por ahora puedes crear la
                página, definir su URL y SEO; el contenido se renderizará cuando habilitemos el page builder.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThemePagesSection;

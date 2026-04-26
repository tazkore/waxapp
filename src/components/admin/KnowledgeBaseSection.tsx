import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Brain, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KbEntry {
  id: string; title: string; content: string; category: string; is_active: boolean;
  created_at: string; updated_at: string;
}

const CATEGORIES = ['general', 'producto', 'envios', 'pagos', 'devoluciones', 'legal', 'lealtad', 'promociones'];

interface KbForm { title: string; content: string; category: string; is_active: boolean }
const empty: KbForm = { title: '', content: '', category: 'general', is_active: true };

const KnowledgeBaseSection = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<KbForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('chatbot_kb').select('*').order('category').order('title');
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setItems((data as KbEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (k: KbEntry) => { setEditId(k.id); setForm({ title: k.title, content: k.content, category: k.category, is_active: k.is_active }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Campos requeridos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { ...form, title: form.title.trim(), content: form.content.trim() };
    const { error } = editId
      ? await supabase.from('chatbot_kb').update(payload).eq('id', editId)
      : await supabase.from('chatbot_kb').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editId ? 'Actualizado' : 'Creado' }); setOpen(false); load(); }
    setSaving(false);
  };

  const del = async (id: string) => {
    const { error } = await supabase.from('chatbot_kb').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Eliminado' }); load(); }
  };

  const toggleActive = async (k: KbEntry) => {
    await supabase.from('chatbot_kb').update({ is_active: !k.is_active }).eq('id', k.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const grouped = items.reduce((acc, k) => {
    (acc[k.category] ??= []).push(k);
    return acc;
  }, {} as Record<string, KbEntry[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Base de Conocimiento del Chatbot</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">El chatbot Waxa usa estos artículos para responder a clientes.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Artículo</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h4>
            <div className="space-y-2">
              {list.map(k => (
                <div key={k.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{k.title}</p>
                      {!k.is_active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{k.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(k)} title={k.is_active ? 'Desactivar' : 'Activar'}><Power className={`h-3.5 w-3.5 ${k.is_active ? 'text-primary' : 'text-muted-foreground'}`} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => del(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">Sin artículos aún.</p>}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <select className="w-full rounded-md bg-muted border border-border px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Contenido</Label>
                <Textarea rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Información que el chatbot usará para responder..." />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <Label>Activo</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseSection;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ImageField from './ImageField';

interface Banner {
  id: string;
  image_path: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  is_active: boolean;
  display_order: number;
}

const empty = { image_path: '', title: '', subtitle: '', cta_text: '', cta_url: '', is_active: true, display_order: 0 };

const BannersSection = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('banners').select('*').order('display_order');
    setBanners(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      image_path: b.image_path, title: b.title ?? '', subtitle: b.subtitle ?? '',
      cta_text: b.cta_text ?? '', cta_url: b.cta_url ?? '', is_active: b.is_active, display_order: b.display_order,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.image_path) { toast.error('Selecciona una imagen'); return; }
    setSaving(true);
    const payload = {
      image_path: form.image_path,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      cta_text: form.cta_text.trim() || null,
      cta_url: form.cta_url.trim() || null,
      is_active: form.is_active,
      display_order: Number(form.display_order) || 0,
    };
    const op = editingId
      ? (supabase as any).from('banners').update(payload).eq('id', editingId)
      : (supabase as any).from('banners').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Banner guardado');
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar banner?')) return;
    await (supabase as any).from('banners').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><ImageIcon className="h-7 w-7 text-primary" /> Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">Carrusel premium en la página principal.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nuevo banner</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : banners.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no hay banners.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="aspect-[16/7] bg-muted relative overflow-hidden">
                <img src={b.image_path} alt={b.title ?? ''} className="w-full h-full object-cover" />
                {!b.is_active && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-background/90 text-muted-foreground font-bold uppercase">Inactivo</span>}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-semibold text-sm text-foreground">{b.title ?? '—'}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{b.subtitle ?? ''}</p>
                <div className="flex justify-end gap-1 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="h-8 gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="h-8 gap-1 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>{editingId ? 'Editar banner' : 'Nuevo banner'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <ImageField value={form.image_path} onChange={(url) => setForm({ ...form, image_path: url ?? '' })} folder="banners" label="Imagen *" />
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Black Friday 50% OFF" /></div>
            <div className="space-y-2"><Label>Subtítulo</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Texto CTA</Label><Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Ver oferta" /></div>
              <div className="space-y-2"><Label>URL CTA</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/tienda" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Orden</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Activo</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannersSection;

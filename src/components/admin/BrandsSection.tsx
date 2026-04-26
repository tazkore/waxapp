import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import ImageField from './ImageField';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const empty = { name: '', slug: '', logo_url: null as string | null, description: '', website: '', is_featured: false, display_order: 0, is_active: true };

const BrandsSection = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('brands').select('*').order('display_order').order('name');
    setBrands(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (b: Brand) => {
    setEditingId(b.id);
    setForm({
      name: b.name, slug: b.slug, logo_url: b.logo_url, description: b.description ?? '',
      website: b.website ?? '', is_featured: b.is_featured, display_order: b.display_order, is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nombre obligatorio'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      logo_url: form.logo_url,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      is_featured: form.is_featured,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    const op = editingId
      ? (supabase as any).from('brands').update(payload).eq('id', editingId)
      : (supabase as any).from('brands').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'Marca actualizada' : 'Marca creada');
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar marca?')) return;
    const { error } = await (supabase as any).from('brands').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marca eliminada');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Tag className="h-7 w-7 text-primary" /> Marcas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona las marcas que vendes y muestralas en el home.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nueva marca</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : brands.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no hay marcas. Crea la primera.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b) => (
            <Card key={b.id} className="p-4 group">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-1" /> : <Tag className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{b.name}</h3>
                    {b.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">Destacada</span>}
                    {!b.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold uppercase">Inactiva</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{b.slug}</p>
                  {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="h-8 gap-1 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="h-8 gap-1 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar marca' : 'Nueva marca'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="KRT" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="krt" />
              </div>
            </div>
            <ImageField value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} folder="brands" label="Logo" />
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sitio web</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Destacada en home</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Activa</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandsSection;

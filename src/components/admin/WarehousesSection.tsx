import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WarehouseRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WForm { name: string; address: string; city: string; state: string; is_active: boolean; }
const empty: WForm = { name: '', address: '', city: '', state: '', is_active: true };

const WarehousesSection = () => {
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<WForm>(empty);

  const fetch = async () => {
    const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setRows((data as unknown as WarehouseRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (w: WarehouseRow) => {
    setEditId(w.id);
    setForm({ name: w.name, address: w.address ?? '', city: w.city ?? '', state: w.state ?? '', is_active: w.is_active });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Error', description: 'El nombre es obligatorio.', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), address: form.address.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null, is_active: form.is_active };
    if (editId) {
      const { error } = await supabase.from('warehouses').update(payload).eq('id', editId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Almacén actualizado' }); setOpen(false); fetch(); }
    } else {
      const { error } = await supabase.from('warehouses').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Almacén creado' }); setOpen(false); fetch(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setRows(prev => prev.filter(r => r.id !== id)); toast({ title: 'Almacén eliminado' }); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Warehouse className="h-6 w-6 text-primary" /> Almacenes</h1>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo Almacén</Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No hay almacenes registrados.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Dirección</TableHead>
                <TableHead className="text-muted-foreground">Ciudad</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Activo</TableHead>
                <TableHead className="text-muted-foreground text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(w => (
                <TableRow key={w.id} className="border-border">
                  <TableCell className="text-foreground font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.address ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{w.city ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{w.state ?? '—'}</TableCell>
                  <TableCell><Badge variant={w.is_active ? 'default' : 'secondary'} className={w.is_active ? 'bg-primary/20 text-primary border-primary/30' : ''}>{w.is_active ? 'Sí' : 'No'}</Badge></TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(w.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="text-foreground">{editId ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label className="text-foreground">Nombre *</Label><Input className="bg-muted border-border" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Almacén Central" /></div>
            <div className="space-y-2"><Label className="text-foreground">Dirección</Label><Input className="bg-muted border-border" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Calle 123" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-foreground">Ciudad</Label><Input className="bg-muted border-border" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-foreground">Estado</Label><Input className="bg-muted border-border" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="text-foreground">Activo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehousesSection;

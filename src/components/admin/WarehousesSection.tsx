import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Warehouse, MapPin, CheckCircle2, XCircle, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WarehouseRow {
  id: string; name: string; address: string | null; city: string | null;
  state: string | null; is_active: boolean; created_at: string; updated_at: string;
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

  const load = async () => {
    const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setRows((data as unknown as WarehouseRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (w: WarehouseRow) => {
    setEditId(w.id);
    setForm({ name: w.name, address: w.address ?? '', city: w.city ?? '', state: w.state ?? '', is_active: w.is_active });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), address: form.address.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null, is_active: form.is_active };
    const { error } = editId
      ? await supabase.from('warehouses').update(payload).eq('id', editId)
      : await supabase.from('warehouses').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editId ? 'Almacén actualizado' : 'Almacén creado' }); setOpen(false); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setRows(p => p.filter(r => r.id !== id)); toast({ title: 'Almacén eliminado' }); }
  };

  const toggleActive = async (w: WarehouseRow) => {
    await supabase.from('warehouses').update({ is_active: !w.is_active }).eq('id', w.id);
    load();
  };

  const total = rows.length;
  const active = rows.filter(r => r.is_active).length;
  const inactive = total - active;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" /> Almacenes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona los centros de distribución y almacenamiento.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Almacén
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: total, icon: Building2, color: 'text-foreground' },
          { label: 'Activos', value: active, icon: CheckCircle2, color: 'text-primary' },
          { label: 'Inactivos', value: inactive, icon: XCircle, color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl py-16 text-center">
          <Warehouse className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Sin almacenes registrados.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-2"><Plus className="h-3.5 w-3.5" /> Crear el primero</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {rows.map((w, i) => (
                    <motion.tr
                      key={w.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${w.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          <span className="font-medium text-foreground">{w.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(w.city || w.state) ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[w.city, w.state].filter(Boolean).join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(w)} className="flex items-center gap-1.5 group/toggle">
                          {w.is_active
                            ? <ToggleRight className="h-5 w-5 text-primary" />
                            : <ToggleLeft className="h-5 w-5 text-muted-foreground/50" />}
                          <Badge variant={w.is_active ? 'default' : 'secondary'} className={`text-[10px] ${w.is_active ? 'bg-primary/15 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                            {w.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" />
              {editId ? 'Editar Almacén' : 'Nuevo Almacén'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-foreground">Nombre *</Label>
              <Input className="bg-muted border-border" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Almacén Central CDMX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Dirección</Label>
              <Input className="bg-muted border-border" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Av. Industria 123" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Ciudad</Label>
                <Input className="bg-muted border-border" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="CDMX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Estado</Label>
                <Input className="bg-muted border-border" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Ciudad de México" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div>
                <Label className="text-foreground">Activo</Label>
                <p className="text-xs text-muted-foreground">El almacén recibe inventario</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editId ? 'Guardar cambios' : 'Crear almacén'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehousesSection;

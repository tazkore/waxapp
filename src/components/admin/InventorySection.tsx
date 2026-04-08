import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface ProductForm {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: string;
  stock: string;
}

const emptyForm: ProductForm = { name: '', description: '', sku: '', category: '', price: '', stock: '' };
const categories = ['Nano-Tech', 'Comestibles', 'Hardware', 'Accesorios'];

const InventorySection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      sku: p.sku ?? '',
      category: p.category ?? '',
      price: String(p.price),
      stock: String(p.stock),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim() || null,
      category: form.category || null,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
    };

    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
        toast({ title: 'Producto actualizado', description: `${payload.name} guardado correctamente.` });
        setOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setProducts(prev => [data, ...prev]);
        toast({ title: 'Producto creado', description: `${payload.name} agregado al inventario.` });
        setOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, sku: string | null) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Producto eliminado', description: `SKU ${sku ?? id} removido del inventario.` });
    }
  };

  const getStatus = (stock: number) => stock <= 10 ? 'Bajo Stock' : 'Óptimo';
  const updateField = (field: keyof ProductForm, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inventario y Productos</h1>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Agregar Nuevo Producto
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-muted-foreground">SKU</TableHead>
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground">Categoría</TableHead>
              <TableHead className="text-muted-foreground text-center">Stock</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Precio</TableHead>
              <TableHead className="text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const status = getStatus(p.stock);
              return (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-mono text-muted-foreground text-sm">{p.sku ?? '—'}</TableCell>
                  <TableCell className="text-foreground font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? '—'}</TableCell>
                  <TableCell className="text-center text-foreground">{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={status === 'Óptimo' ? 'default' : 'destructive'}
                      className={status === 'Óptimo' ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-foreground">${p.price.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id, p.sku)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre *</Label>
                <Input className="bg-muted border-border" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Nombre del producto" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">SKU</Label>
                <Input className="bg-muted border-border" value={form.sku} onChange={e => updateField('sku', e.target.value)} placeholder="WAX-006" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Descripción</Label>
              <Textarea className="bg-muted border-border resize-none" rows={2} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Descripción breve" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Categoría</Label>
                <Select value={form.category} onValueChange={v => updateField('category', v)}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Precio (MXN)</Label>
                <Input className="bg-muted border-border" type="number" min="0" step="0.01" value={form.price} onChange={e => updateField('price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Stock</Label>
                <Input className="bg-muted border-border" type="number" min="0" value={form.stock} onChange={e => updateField('stock', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventorySection;

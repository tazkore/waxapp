import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Filter, Layers } from 'lucide-react';
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
import ImageField from './ImageField';

type Product = Tables<'products'> & { brand_id?: string | null; image_url?: string | null };

interface VariantRow { id?: string; name: string; price: string; stock: string; sku: string; image_url: string | null; }

interface ProductForm {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: string;
  stock: string;
  warehouse_id: string;
  brand_id: string;
  image_url: string | null;
}

interface WarehouseOption { id: string; name: string; }
interface BrandOption { id: string; name: string; }

const emptyForm: ProductForm = { name: '', description: '', sku: '', category: '', price: '', stock: '', warehouse_id: '', brand_id: '', image_url: null };
const categories = ['Nano-Tech', 'Comestibles', 'Hardware', 'Accesorios'];

const InventorySection = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [brandList, setBrandList] = useState<BrandOption[]>([]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = search === '' || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setProducts(data ?? []);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').eq('is_active', true);
    setWarehouses((data as unknown as WarehouseOption[]) ?? []);
  };

  const fetchBrands = async () => {
    const { data } = await (supabase as any).from('brands').select('id, name').eq('is_active', true).order('name');
    setBrandList(data ?? []);
  };

  const fetchVariants = async (productId: string) => {
    const { data } = await supabase.from('product_variants').select('*').eq('product_id', productId).order('created_at');
    setVariants((data ?? []).map((v: any) => ({ id: v.id, name: v.name, price: String(v.price), stock: String(v.stock), sku: v.sku ?? '', image_url: v.image_url ?? null })));
  };

  useEffect(() => { fetchProducts(); fetchWarehouses(); fetchBrands(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setVariants([]);
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
      warehouse_id: (p as any).warehouse_id ?? '',
      brand_id: (p as any).brand_id ?? '',
      image_url: (p as any).image_url ?? null,
    });
    fetchVariants(p.id);
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
      warehouse_id: form.warehouse_id && form.warehouse_id !== 'none' ? form.warehouse_id : null,
      brand_id: form.brand_id && form.brand_id !== 'none' ? form.brand_id : null,
      image_url: form.image_url,
    };

    if (editingId) {
      const { error } = await supabase.from('products').update(payload as any).eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        await saveVariants(editingId);
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
        toast({ title: 'Producto actualizado', description: `${payload.name} guardado correctamente.` });
        setOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('products').insert(payload as any).select().single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        await saveVariants(data.id);
        setProducts(prev => [data, ...prev]);
        toast({ title: 'Producto creado', description: `${payload.name} agregado al inventario.` });
        setOpen(false);
      }
    }
    setSaving(false);
  };

  const saveVariants = async (productId: string) => {
    await supabase.from('product_variants').delete().eq('product_id', productId);
    const toInsert = variants.filter(v => v.name.trim()).map(v => ({
      product_id: productId,
      name: v.name.trim(),
      price: parseFloat(v.price) || 0,
      stock: parseInt(v.stock) || 0,
      sku: v.sku.trim() || null,
      image_url: v.image_url,
    }));
    if (toInsert.length > 0) {
      await supabase.from('product_variants').insert(toInsert as any);
    }
  };

  const addVariant = () => setVariants(prev => [...prev, { name: '', price: '', stock: '', sku: '', image_url: null }]);
  const removeVariant = (idx: number) => setVariants(prev => prev.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, field: keyof VariantRow, value: string | null) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value as any } : v));

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
        {isAdmin && (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Agregar Nuevo Producto
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted border-border"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-muted border-border">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          {products.length === 0 ? 'No hay productos en el inventario.' : 'No se encontraron productos con los filtros aplicados.'}
        </div>
      ) : (
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
            {filteredProducts.map((p) => {
              const status = getStatus(p.stock);
              return (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-mono text-muted-foreground text-sm">{p.sku ?? '—'}</TableCell>
                  <TableCell className="text-foreground font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    {isAdmin ? (
                      <Input
                        type="number"
                        min="0"
                        value={p.stock}
                        onChange={async (e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, stock: newStock } : pr));
                        }}
                        onBlur={async (e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          await supabase.from('products').update({ stock: newStock }).eq('id', p.id);
                        }}
                        className="w-20 mx-auto text-center bg-muted border-border h-8 text-sm"
                      />
                    ) : (
                      <span className="text-foreground">{p.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === 'Óptimo' ? 'default' : 'destructive'}
                      className={status === 'Óptimo' ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.price}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, price: newPrice } : pr));
                        }}
                        onBlur={async (e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          await supabase.from('products').update({ price: newPrice }).eq('id', p.id);
                        }}
                        className="w-24 ml-auto text-right bg-muted border-border h-8 text-sm"
                      />
                    ) : (
                      <span className="text-foreground">${p.price.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isAdmin && (
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id, p.sku)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Image */}
            <div className="border-t border-border pt-4">
              <ImageField
                value={form.image_url}
                onChange={(url) => setForm(prev => ({ ...prev, image_url: url }))}
                folder="products"
                label="Imagen del producto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Warehouse selector */}
              {warehouses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-foreground">Almacén</Label>
                  <Select value={form.warehouse_id} onValueChange={v => updateField('warehouse_id', v)}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Brand selector */}
              <div className="space-y-2">
                <Label className="text-foreground">Marca</Label>
                <Select value={form.brand_id || 'none'} onValueChange={v => updateField('brand_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Sin marca" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Sin marca</SelectItem>
                    {brandList.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Variantes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
              </div>
              {variants.length === 0 && <p className="text-xs text-muted-foreground">Sin variantes. El producto se vende como unidad única.</p>}
              {variants.map((v, idx) => (
                <div key={idx} className="space-y-2 p-3 rounded-md bg-muted/30 border border-border">
                  <div className="grid grid-cols-[1fr_80px_80px_100px_32px] gap-2 items-end">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Nombre</Label>
                      <Input className="bg-muted border-border h-8 text-sm" value={v.name} onChange={e => updateVariant(idx, 'name', e.target.value)} placeholder="30mg" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Precio</Label>
                      <Input className="bg-muted border-border h-8 text-sm" type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Stock</Label>
                      <Input className="bg-muted border-border h-8 text-sm" type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">SKU</Label>
                      <Input className="bg-muted border-border h-8 text-sm" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeVariant(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <ImageField
                    value={v.image_url}
                    onChange={(url) => updateVariant(idx, 'image_url', url)}
                    folder="products"
                    size="sm"
                  />
                </div>
              ))}
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

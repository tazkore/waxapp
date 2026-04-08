import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const InventorySection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string, sku: string | null) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Producto eliminado', description: `SKU ${sku ?? id} removido del inventario.` });
    }
  };

  const getStatus = (stock: number) => stock <= 10 ? 'Bajo Stock' : 'Óptimo';

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inventario y Productos</h1>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
    </div>
  );
};

export default InventorySection;

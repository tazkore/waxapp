import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { inventoryData, Product } from '@/data/dashboardData';
import { toast } from '@/hooks/use-toast';

const InventorySection = () => {
  const [products, setProducts] = useState<Product[]>(inventoryData);

  const handleDelete = (sku: string) => {
    setProducts((prev) => prev.filter((p) => p.sku !== sku));
    toast({ title: 'Producto eliminado', description: `SKU ${sku} removido del inventario.` });
  };

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
            {products.map((p) => (
              <TableRow key={p.sku} className="border-border">
                <TableCell className="font-mono text-muted-foreground text-sm">{p.sku}</TableCell>
                <TableCell className="text-foreground font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className="text-center text-foreground">{p.stock}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'Óptimo' ? 'default' : 'destructive'}
                    className={p.status === 'Óptimo' ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-foreground">${p.price.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.sku)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InventorySection;

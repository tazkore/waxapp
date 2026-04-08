import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { couponsData, Coupon } from '@/data/dashboardData';
import { toast } from '@/hooks/use-toast';

const SettingsSection = () => {
  const [seo, setSeo] = useState({ title: 'WAXAPP — Suplementos Bio-Tech de Alta Gama', description: 'Fórmulas con nanotecnología y hardware de bienestar. Legal, rápido y seguro.', keywords: 'nanotecnología, suplementos, bienestar, México', indexing: true });
  const [coupons, setCoupons] = useState<Coupon[]>(couponsData);

  const handleDeleteCoupon = (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    toast({ title: 'Cupón eliminado', description: code });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Configuración y SEO</h1>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-foreground text-lg">SEO Global</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Meta Título</Label>
            <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Meta Descripción</Label>
            <Textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} className="bg-muted border-border text-foreground" rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Palabras Clave</Label>
            <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className="bg-muted border-border text-foreground" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-foreground">Activar Indexación en Google</Label>
            <Switch checked={seo.indexing} onCheckedChange={(v) => setSeo({ ...seo, indexing: v })} />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            onClick={() => toast({ title: 'SEO guardado', description: 'Configuración actualizada correctamente.' })}>
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-lg">Gestor de Cupones</CardTitle>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1" /> Crear Cupón
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Código</TableHead>
                  <TableHead className="text-muted-foreground">Descuento</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.code} className="border-border">
                    <TableCell className="font-mono text-foreground">{c.code}</TableCell>
                    <TableCell className="text-foreground">{c.discount}</TableCell>
                    <TableCell>
                      <Badge className={c.active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground'}>
                        {c.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCoupon(c.code)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;

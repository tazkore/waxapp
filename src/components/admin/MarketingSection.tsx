import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Tag, Calendar, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Discount {
  id: string;
  code: string;
  type: string;
  value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const MarketingSection = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '',
  });

  const fetchDiscounts = async () => {
    const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setDiscounts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDiscounts(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.value) {
      toast({ title: 'Error', description: 'Código y valor son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    const { data, error } = await supabase.from('discounts').insert(payload).select().single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setDiscounts(prev => [(data as any), ...prev]);
      toast({ title: 'Descuento creado', description: `Código ${payload.code} creado exitosamente.` });
      setOpen(false);
      setForm({ code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('discounts').update({ is_active: !current }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setDiscounts(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Descuento eliminado' });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Marketing y Descuentos</h1>
        {isAdmin && (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Crear Código
          </Button>
        )}
      </div>

      {discounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay códigos de descuento creados.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Código</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="text-muted-foreground text-center">Usos</TableHead>
                <TableHead className="text-muted-foreground">Expira</TableHead>
                <TableHead className="text-muted-foreground text-center">Activo</TableHead>
                {isAdmin && <TableHead className="text-muted-foreground text-center">Acción</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => {
                const isExpired = d.expires_at && new Date(d.expires_at) < new Date();
                return (
                  <TableRow key={d.id} className="border-border">
                    <TableCell className="font-mono font-bold text-foreground">{d.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border">
                        {d.type === 'percentage' ? <Percent className="h-3 w-3 mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                        {d.type === 'percentage' ? 'Porcentaje' : 'Fijo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground font-semibold">
                      {d.type === 'percentage' ? `${d.value}%` : `$${d.value.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ''}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.expires_at ? (
                        <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
                          {new Date(d.expires_at).toLocaleDateString('es-MX')}
                          {isExpired && ' (Expirado)'}
                        </span>
                      ) : <span className="text-muted-foreground">Sin límite</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={d.is_active} onCheckedChange={() => isAdmin && toggleActive(d.id, d.is_active)} disabled={!isAdmin} />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Discount Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nuevo Código de Descuento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Código *</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="bg-muted border-border font-mono uppercase" placeholder="VERANO2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Valor *</Label>
                <Input type="number" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="bg-muted border-border" placeholder={form.type === 'percentage' ? '20' : '100'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Compra mínima</Label>
                <Input type="number" min="0" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} className="bg-muted border-border" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Usos máximos</Label>
                <Input type="number" min="1" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} className="bg-muted border-border" placeholder="Sin límite" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Fecha de expiración</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="bg-muted border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingSection;

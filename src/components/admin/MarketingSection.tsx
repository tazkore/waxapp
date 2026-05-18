import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Tag, Percent, DollarSign, CheckCircle2, XCircle, BarChart3, TrendingUp, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Discount {
  id: string; code: string; type: string; value: number;
  min_purchase: number; max_uses: number | null; used_count: number;
  is_active: boolean; expires_at: string | null; created_at: string;
}

const MarketingSection = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' });

  const load = async () => {
    const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setDiscounts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (d: Discount) => {
    await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
    load();
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.value) {
      toast({ title: 'Código y valor son obligatorios.', variant: 'destructive' });
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
    const { error } = await supabase.from('discounts').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Cupón creado' }); setOpen(false); setForm({ code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' }); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setDiscounts(p => p.filter(d => d.id !== id)); toast({ title: 'Cupón eliminado' }); }
  };

  const filtered = discounts.filter(d => {
    if (search && !d.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive === 'active' && !d.is_active) return false;
    if (filterActive === 'inactive' && d.is_active) return false;
    return true;
  });

  const totalUses = discounts.reduce((s, d) => s + d.used_count, 0);
  const activeCount = discounts.filter(d => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" /> Marketing & Cupones
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona descuentos y códigos promocionales.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Cupón
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total cupones', value: discounts.length, icon: Tag, color: 'text-foreground' },
          { label: 'Activos', value: activeCount, icon: CheckCircle2, color: 'text-primary' },
          { label: 'Inactivos', value: discounts.length - activeCount, icon: XCircle, color: 'text-muted-foreground' },
          { label: 'Usos totales', value: totalUses, icon: TrendingUp, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`h-7 w-7 ${s.color} opacity-80 shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
        </div>
        <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{search ? 'Sin resultados.' : 'Sin cupones creados.'}</p>
          {!search && <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="mt-4 gap-2"><Plus className="h-3.5 w-3.5" /> Crear cupón</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descuento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((d, i) => {
                    const usePct = d.max_uses ? Math.min((d.used_count / d.max_uses) * 100, 100) : null;
                    return (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded text-xs tracking-widest">{d.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {d.type === 'percentage'
                              ? <><Percent className="h-3.5 w-3.5 text-primary" /><span className="text-foreground font-medium">{d.value}%</span></>
                              : <><DollarSign className="h-3.5 w-3.5 text-primary" /><span className="text-foreground font-medium">${d.value} MXN</span></>}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ''} usos
                            </p>
                            {usePct !== null && (
                              <div className="h-1 bg-muted rounded-full overflow-hidden w-24">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${usePct}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString('es-MX') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleActive(d)}>
                            <Badge className={`text-[10px] cursor-pointer ${d.is_active ? 'bg-primary/15 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                              {d.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
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
              <Tag className="h-4 w-4 text-primary" /> Nuevo Cupón de Descuento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Código *</Label>
                <Input className="bg-muted border-border font-mono uppercase" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BIENVENIDA15" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Valor *</Label>
                <Input type="number" className="bg-muted border-border" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '15' : '100'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Compra mínima ($)</Label>
                <Input type="number" className="bg-muted border-border" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Máx. usos</Label>
                <Input type="number" className="bg-muted border-border" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Sin límite" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Vence el</Label>
                <Input type="date" className="bg-muted border-border" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Crear cupón
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingSection;

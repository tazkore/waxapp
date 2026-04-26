import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Edit2, Copy, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Fees { percent?: number; fixed?: number }
interface Config { min_amount?: number; max_amount?: number; expires_hours?: number; [k: string]: unknown }

interface Gateway {
  id: string;
  slug: string;
  name: string;
  type: string; // 'gateway' | 'manual'
  is_active: boolean;
  description: string | null;
  instructions: string | null;
  fees: Fees;
  config: Config;
  supports_refunds: boolean;
  requires_verification: boolean;
  display_order: number;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

const PaymentsGateways = () => {
  const [list, setList] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('payment_gateways').select('*').order('display_order');
    setList((data ?? []) as Gateway[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (g: Gateway) => {
    const { error } = await supabase.from('payment_gateways').update({ is_active: !g.is_active }).eq('id', g.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: g.is_active ? 'Pasarela desactivada' : 'Pasarela activada' });
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (editing.config.min_amount != null && editing.config.max_amount != null
      && Number(editing.config.min_amount) > Number(editing.config.max_amount)) {
      return toast({ title: 'Reglas inválidas', description: 'El monto mínimo no puede ser mayor al máximo.', variant: 'destructive' });
    }
    const { error } = await supabase.from('payment_gateways').update({
      name: editing.name,
      description: editing.description,
      instructions: editing.instructions,
      fees: editing.fees as unknown as Record<string, number>,
      config: editing.config as unknown as Record<string, unknown>,
      requires_verification: editing.requires_verification,
      supports_refunds: editing.supports_refunds,
    }).eq('id', editing.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Pasarela actualizada' });
    setEditing(null);
    load();
  };

  const createManual = async () => {
    const name = newName.trim();
    if (name.length < 2) return toast({ title: 'Nombre requerido', variant: 'destructive' });
    const slug = slugify(name);
    if (list.some(g => g.slug === slug)) {
      return toast({ title: 'Ya existe', description: 'Ya hay una pasarela con ese identificador.', variant: 'destructive' });
    }
    const { error } = await supabase.from('payment_gateways').insert({
      slug, name, type: 'manual',
      description: newDesc.trim() || null,
      requires_verification: true,
      supports_refunds: false,
      is_active: false,
      fees: { percent: 0, fixed: 0 },
      config: { min_amount: 1, max_amount: 100000 },
      display_order: (list.at(-1)?.display_order ?? 0) + 10,
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Método creado', description: 'Configúralo y actívalo cuando esté listo.' });
    setCreating(false); setNewName(''); setNewDesc('');
    load();
  };

  const remove = async (g: Gateway) => {
    if (['clip', 'stripe', 'mercadopago', 'bank_transfer', 'cash', 'oxxo'].includes(g.slug)) {
      return toast({ title: 'No se puede eliminar', description: 'Es un método base; puedes desactivarlo.', variant: 'destructive' });
    }
    if (!confirm(`¿Eliminar "${g.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('payment_gateways').delete().eq('id', g.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Eliminado' });
    load();
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clip-webhook`;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Pasarelas y métodos de pago</h3>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Nuevo método manual</Button>
      </div>

      <div className="grid gap-3">
        {list.map(g => (
          <Card key={g.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {g.name}
                    <Badge variant="outline" className="text-xs">{g.type === 'manual' ? 'Manual' : 'Automática'}</Badge>
                    {!g.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactiva</Badge>}
                  </CardTitle>
                  {g.description && <p className="text-xs text-muted-foreground mt-1">{g.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit2 className="h-4 w-4" /></Button>
                  {g.type === 'manual' && !['bank_transfer','cash','oxxo'].includes(g.slug) && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                  <Switch checked={g.is_active} onCheckedChange={() => toggle(g)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>Comisión: <strong className="text-foreground">{g.fees?.percent ?? 0}%</strong> + <strong className="text-foreground">${g.fees?.fixed ?? 0}</strong></span>
                {(g.config?.min_amount != null || g.config?.max_amount != null) && (
                  <span>
                    Monto: ${g.config?.min_amount ?? 0} – ${g.config?.max_amount ?? '∞'}
                  </span>
                )}
                {g.config?.expires_hours != null && <span>Expira en {String(g.config.expires_hours)}h</span>}
                {g.requires_verification && <span className="text-amber-500">⚠ Verificación manual</span>}
                {g.supports_refunds && <span className="text-green-500">↩ Reembolsos</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader><CardTitle className="text-sm">Webhook de Clip</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Configura esta URL en tu panel de Clip para recibir actualizaciones en tiempo real:</p>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: 'Copiado al portapapeles' }); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editar pasarela */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div><Label>Nombre</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Instrucciones para el cliente</Label><Textarea rows={3} value={editing.instructions ?? ''} onChange={e => setEditing({ ...editing, instructions: e.target.value })} placeholder="Ej: Realiza la transferencia y sube el comprobante." /></div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Comisión %</Label><Input type="number" step="0.01" value={editing.fees?.percent ?? 0} onChange={e => setEditing({ ...editing, fees: { ...editing.fees, percent: Number(e.target.value) } })} /></div>
                <div><Label>Comisión fija ($)</Label><Input type="number" step="0.01" value={editing.fees?.fixed ?? 0} onChange={e => setEditing({ ...editing, fees: { ...editing.fees, fixed: Number(e.target.value) } })} /></div>
              </div>

              <div className="border-t border-border pt-3">
                <Label className="text-xs uppercase text-muted-foreground">Reglas</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div><Label className="text-xs">Monto mínimo</Label><Input type="number" step="0.01" value={editing.config?.min_amount ?? ''} onChange={e => setEditing({ ...editing, config: { ...editing.config, min_amount: e.target.value === '' ? undefined : Number(e.target.value) } })} /></div>
                  <div><Label className="text-xs">Monto máximo</Label><Input type="number" step="0.01" value={editing.config?.max_amount ?? ''} onChange={e => setEditing({ ...editing, config: { ...editing.config, max_amount: e.target.value === '' ? undefined : Number(e.target.value) } })} /></div>
                  <div><Label className="text-xs">Expira (h)</Label><Input type="number" value={editing.config?.expires_hours ?? ''} onChange={e => setEditing({ ...editing, config: { ...editing.config, expires_hours: e.target.value === '' ? undefined : Number(e.target.value) } })} /></div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={editing.requires_verification} onCheckedChange={(v) => setEditing({ ...editing, requires_verification: v })} />
                  <Label className="text-sm">Verificación manual</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.supports_refunds} onCheckedChange={(v) => setEditing({ ...editing, supports_refunds: v })} />
                  <Label className="text-sm">Acepta reembolsos</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear método manual */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo método manual</DialogTitle>
            <DialogDescription>Crea un método de pago personalizado (ej. PayPal manual, depósito en sucursal, criptomonedas…). Lo configurarás después.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej. Depósito Banorte" maxLength={60} /></div>
            <div><Label>Descripción corta</Label><Textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={200} /></div>
            <p className="text-xs text-muted-foreground">Identificador: <code className="text-foreground">{slugify(newName) || '—'}</code></p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={createManual} disabled={newName.trim().length < 2}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsGateways;

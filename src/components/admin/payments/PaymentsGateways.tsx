import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Edit2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Gateway {
  id: string;
  slug: string;
  name: string;
  type: string;
  is_active: boolean;
  description: string | null;
  instructions: string | null;
  fees: { percent?: number; fixed?: number };
  supports_refunds: boolean;
  requires_verification: boolean;
}

const PaymentsGateways = () => {
  const [list, setList] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Gateway | null>(null);
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
    const { error } = await supabase.from('payment_gateways').update({
      name: editing.name,
      description: editing.description,
      instructions: editing.instructions,
      fees: editing.fees,
      requires_verification: editing.requires_verification,
    }).eq('id', editing.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Pasarela actualizada' });
    setEditing(null);
    load();
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clip-webhook`;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {list.map(g => (
          <Card key={g.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {g.name}
                    <span className="text-xs text-muted-foreground font-normal">({g.type === 'manual' ? 'Manual' : 'Automática'})</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit2 className="h-4 w-4" /></Button>
                  <Switch checked={g.is_active} onCheckedChange={() => toggle(g)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>Comisión: {g.fees?.percent ?? 0}% + ${g.fees?.fixed ?? 0}</div>
              {g.requires_verification && <div className="text-amber-500">⚠ Requiere verificación manual</div>}
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Instrucciones para el cliente</Label><Textarea rows={3} value={editing.instructions ?? ''} onChange={e => setEditing({ ...editing, instructions: e.target.value })} placeholder="Ej: Realiza la transferencia y sube el comprobante." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Comisión %</Label><Input type="number" step="0.01" value={editing.fees?.percent ?? 0} onChange={e => setEditing({ ...editing, fees: { ...editing.fees, percent: Number(e.target.value) } })} /></div>
                <div><Label>Comisión fija</Label><Input type="number" step="0.01" value={editing.fees?.fixed ?? 0} onChange={e => setEditing({ ...editing, fees: { ...editing.fees, fixed: Number(e.target.value) } })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.requires_verification} onCheckedChange={(v) => setEditing({ ...editing, requires_verification: v })} />
                <Label className="text-sm">Requiere verificación manual</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsGateways;

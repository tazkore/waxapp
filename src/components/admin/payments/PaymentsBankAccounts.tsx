import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Bank {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string | null;
  clabe: string | null;
  swift: string | null;
  is_active: boolean;
  notes: string | null;
}

const empty: Bank = { id: '', bank_name: '', account_holder: '', account_number: '', clabe: '', swift: '', is_active: true, notes: '' };

const PaymentsBankAccounts = () => {
  const [list, setList] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Bank | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('bank_accounts').select('*').order('display_order');
    setList((data ?? []) as Bank[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.bank_name || !editing.account_holder) {
      return toast({ title: 'Faltan datos', description: 'Banco y titular son obligatorios.', variant: 'destructive' });
    }
    const payload = {
      bank_name: editing.bank_name,
      account_holder: editing.account_holder,
      account_number: editing.account_number,
      clabe: editing.clabe,
      swift: editing.swift,
      is_active: editing.is_active,
      notes: editing.notes,
    };
    const { error } = editing.id
      ? await supabase.from('bank_accounts').update(payload).eq('id', editing.id)
      : await supabase.from('bank_accounts').insert(payload);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: editing.id ? 'Cuenta actualizada' : 'Cuenta agregada' });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    await supabase.from('bank_accounts').delete().eq('id', id);
    toast({ title: 'Eliminada' });
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cuentas mostradas al cliente al elegir transferencia bancaria.</p>
        <Button size="sm" onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" />Agregar cuenta</Button>
      </div>

      {list.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No hay cuentas bancarias configuradas.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(b => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{b.bank_name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Titular:</span> {b.account_holder}</div>
                {b.account_number && <div><span className="text-muted-foreground">Cuenta:</span> <span className="font-mono">{b.account_number}</span></div>}
                {b.clabe && <div><span className="text-muted-foreground">CLABE:</span> <span className="font-mono">{b.clabe}</span></div>}
                {b.swift && <div><span className="text-muted-foreground">SWIFT:</span> <span className="font-mono">{b.swift}</span></div>}
                {!b.is_active && <span className="text-xs text-muted-foreground">(inactiva)</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nueva'} cuenta bancaria</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Banco *</Label><Input value={editing.bank_name} onChange={e => setEditing({ ...editing, bank_name: e.target.value })} placeholder="BBVA, Banorte…" /></div>
              <div><Label>Titular *</Label><Input value={editing.account_holder} onChange={e => setEditing({ ...editing, account_holder: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Número de cuenta</Label><Input value={editing.account_number ?? ''} onChange={e => setEditing({ ...editing, account_number: e.target.value })} /></div>
                <div><Label>CLABE</Label><Input value={editing.clabe ?? ''} onChange={e => setEditing({ ...editing, clabe: e.target.value })} maxLength={18} /></div>
              </div>
              <div><Label>SWIFT (internacional)</Label><Input value={editing.swift ?? ''} onChange={e => setEditing({ ...editing, swift: e.target.value })} /></div>
              <div><Label>Notas</Label><Textarea rows={2} value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Activa</Label></div>
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

export default PaymentsBankAccounts;

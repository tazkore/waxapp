import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, ListChecks } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  applies_to: 'product' | 'client' | 'order';
  options: string[];
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

const blank: Omit<CustomField, 'id'> = {
  key: '', label: '', type: 'text', applies_to: 'product',
  options: [], is_required: false, display_order: 0, is_active: true,
};

const SettingsCustomFields = () => {
  const [items, setItems] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<CustomField, 'id'>>(blank);
  const [optionsRaw, setOptionsRaw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('custom_fields').select('*').order('applies_to').order('display_order');
    setItems(((data as any[]) || []).map((d) => ({ ...d, options: Array.isArray(d.options) ? d.options : [] })) as CustomField[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.key || !draft.label) {
      toast({ title: 'Faltan datos', description: 'Clave y etiqueta requeridas.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const opts = draft.type === 'select' ? optionsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const { error } = await supabase.from('custom_fields').insert({ ...draft, options: opts });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setOpen(false); setDraft(blank); setOptionsRaw(''); load(); toast({ title: 'Campo creado' }); }
  };

  const toggle = async (f: CustomField, v: boolean) => {
    await supabase.from('custom_fields').update({ is_active: v }).eq('id', f.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este campo?')) return;
    await supabase.from('custom_fields').delete().eq('id', id);
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Campos personalizados</CardTitle>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nuevo campo</Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Define atributos extra para productos, clientes o pedidos. Aparecerán automáticamente en sus formularios.
        </p>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Req.</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id} className="border-border">
                    <TableCell className="text-foreground">{f.label}</TableCell>
                    <TableCell className="font-mono text-xs">{f.key}</TableCell>
                    <TableCell><Badge variant="outline">{f.type}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{f.applies_to}</Badge></TableCell>
                    <TableCell>{f.is_required ? '✓' : '—'}</TableCell>
                    <TableCell><Switch checked={f.is_active} onCheckedChange={(v) => toggle(f, v)} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => remove(f.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin campos personalizados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo campo personalizado</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Etiqueta visible</Label><Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="bg-muted border-border" /></div>
            <div className="space-y-1"><Label>Clave (sin espacios)</Label><Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.replace(/\s+/g,'_').toLowerCase() })} className="bg-muted border-border font-mono" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={draft.type} onValueChange={(v: any) => setDraft({ ...draft, type: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(['text','textarea','number','select','date','checkbox'] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Aplica a</Label>
                <Select value={draft.applies_to} onValueChange={(v: any) => setDraft({ ...draft, applies_to: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="order">Pedido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.type === 'select' && (
              <div className="space-y-1">
                <Label>Opciones (separadas por coma)</Label>
                <Input value={optionsRaw} onChange={(e) => setOptionsRaw(e.target.value)} placeholder="Pequeño, Mediano, Grande" className="bg-muted border-border" />
              </div>
            )}
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <Label>Requerido</Label>
              <Switch checked={draft.is_required} onCheckedChange={(v) => setDraft({ ...draft, is_required: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SettingsCustomFields;

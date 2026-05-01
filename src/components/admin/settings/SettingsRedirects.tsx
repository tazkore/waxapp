import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Link2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  reason: string | null;
}

const SettingsRedirects = () => {
  const [items, setItems] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('seo_redirects').select('*').order('updated_at', { ascending: false });
    setItems((data as Redirect[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!from.startsWith('/') || !to.startsWith('/')) {
      toast({ title: 'Rutas inválidas', description: 'Las rutas deben iniciar con /', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('seo_redirects').upsert(
      { from_path: from, to_path: to, status_code: 301, is_active: true, reason: 'Manual' },
      { onConflict: 'from_path' }
    );
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setFrom(''); setTo(''); load(); toast({ title: 'Redirección creada' }); }
  };

  const toggle = async (r: Redirect, v: boolean) => {
    await supabase.from('seo_redirects').update({ is_active: v }).eq('id', r.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('seo_redirects').delete().eq('id', id);
    load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground">Redireccionamientos 301</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input placeholder="/ruta-antigua" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-muted border-border" /></div>
          <div className="space-y-1"><Label className="text-xs">A</Label><Input placeholder="/ruta-nueva" value={to} onChange={(e) => setTo(e.target.value)} className="bg-muted border-border" /></div>
          <Button onClick={add} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Agregar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>De</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead className="w-20">Activa</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="font-mono text-xs text-foreground">{r.from_path}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{r.to_path}</TableCell>
                    <TableCell>{r.status_code}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggle(r, v)} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin redirecciones configuradas.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsRedirects;

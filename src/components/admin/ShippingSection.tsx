import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, PackageCheck, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ShippingProvider {
  id: string;
  name: string;
  slug: string;
  api_key_ref: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SForm { name: string; slug: string; api_key_ref: string; is_active: boolean; }
const empty: SForm = { name: '', slug: '', api_key_ref: '', is_active: false };

const PRESETS = [
  { name: 'Skydropx', slug: 'skydropx', description: 'Plataforma multi-paquetería para México' },
  { name: 'Envia.com', slug: 'enviacom', description: 'Envíos nacionales e internacionales' },
  { name: 'Fedex', slug: 'fedex', description: 'Servicio global de paquetería' },
  { name: 'DHL', slug: 'dhl', description: 'Logística y envíos express' },
  { name: '99 Minutos', slug: '99minutos', description: 'Envío express en ciudades principales' },
];

const ShippingSection = () => {
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SForm>(empty);

  const fetchProviders = async () => {
    const { data, error } = await supabase.from('shipping_providers').select('*').order('created_at');
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setProviders((data as unknown as ShippingProvider[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const openCreate = (preset?: typeof PRESETS[0]) => {
    setEditId(null);
    setForm(preset ? { name: preset.name, slug: preset.slug, api_key_ref: '', is_active: false } : empty);
    setOpen(true);
  };

  const openEdit = (p: ShippingProvider) => {
    setEditId(p.id);
    setForm({ name: p.name, slug: p.slug, api_key_ref: p.api_key_ref ?? '', is_active: p.is_active });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast({ title: 'Error', description: 'Nombre y slug son obligatorios.', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), slug: form.slug.trim(), api_key_ref: form.api_key_ref.trim() || null, is_active: form.is_active };
    if (editId) {
      const { error } = await supabase.from('shipping_providers').update(payload).eq('id', editId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Proveedor actualizado' }); setOpen(false); fetchProviders(); }
    } else {
      const { error } = await supabase.from('shipping_providers').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Proveedor agregado' }); setOpen(false); fetchProviders(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('shipping_providers').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setProviders(prev => prev.filter(p => p.id !== id)); toast({ title: 'Proveedor eliminado' }); }
  };

  const toggleActive = async (p: ShippingProvider) => {
    const { error } = await supabase.from('shipping_providers').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchProviders();
  };

  const installedSlugs = providers.map(p => p.slug);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><PackageCheck className="h-6 w-6 text-primary" /> Guías de Envío</h1>
          <p className="text-sm text-muted-foreground">Conecta proveedores de guías para generar envíos desde tus pedidos.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" /> Personalizado</Button>
      </div>

      {/* Presets */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Proveedores Disponibles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESETS.map(preset => {
            const installed = installedSlugs.includes(preset.slug);
            return (
              <Card key={preset.slug} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{preset.name}</p>
                    <p className="text-[11px] text-muted-foreground">{preset.description}</p>
                  </div>
                  {installed ? (
                    <Badge variant="outline" className="text-primary border-primary/30 text-xs">Instalado</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openCreate(preset)}>Agregar</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Installed */}
      {providers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Proveedores Configurados</h3>
          <div className="space-y-2">
            {providers.map(p => (
              <Card key={p.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${p.is_active ? 'bg-primary/20' : 'bg-muted'}`}>
                      {p.is_active ? <Power className="h-4 w-4 text-primary" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{p.slug} — API: {p.api_key_ref ? '••••••' : 'No configurada'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="text-foreground">{editId ? 'Editar Proveedor' : 'Agregar Proveedor'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-foreground">Nombre *</Label><Input className="bg-muted border-border" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-foreground">Slug *</Label><Input className="bg-muted border-border" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Referencia API Key</Label>
              <Input className="bg-muted border-border" value={form.api_key_ref} onChange={e => setForm({ ...form, api_key_ref: e.target.value })} placeholder="Nombre del secret (ej. SKYDROPX_API_KEY)" />
              <p className="text-[10px] text-muted-foreground">Nombre del secret configurado en el backend. Se usará al generar guías.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label className="text-foreground">Activo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editId ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingSection;

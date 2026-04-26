import { useEffect, useState } from 'react';
import { PackageCheck, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Provider { id: string; name: string; slug: string; is_active: boolean }
interface Shipment {
  id: string; carrier: string; tracking_number: string | null; tracking_url: string | null;
  status: string; cost: number; service_level: string | null; created_at: string;
}

interface Props {
  orderId: string;
  destinationPostal?: string;
  onCreated?: (trackingNumber: string) => void;
}

const GenerateLabelButton = ({ orderId, destinationPostal, onCreated }: Props) => {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carrier, setCarrier] = useState('');
  const [service, setService] = useState('standard');
  const [weight, setWeight] = useState('1');
  const [postal, setPostal] = useState(destinationPostal ?? '');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('shipping_providers').select('id,name,slug,is_active').eq('is_active', true),
      supabase.from('shipments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    ]);
    const provs = (pRes.data ?? []) as Provider[];
    setProviders(provs);
    if (!carrier && provs[0]) setCarrier(provs[0].slug);
    setShipments((sRes.data ?? []) as Shipment[]);
  };

  useEffect(() => { if (open) refresh(); }, [open]);
  useEffect(() => { refresh(); }, [orderId]);

  const generate = async () => {
    if (!carrier) { toast({ title: 'Selecciona un proveedor', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-shipment', {
        body: {
          order_id: orderId,
          carrier_slug: carrier,
          service_level: service,
          weight_kg: Number(weight) || 1,
          destination_postal: postal || null,
        },
      });
      if (error) throw error;
      const s = data?.shipment as Shipment;
      toast({
        title: data?.real_api ? '✅ Guía generada (API real)' : 'Guía generada',
        description: `${s.carrier} · ${s.tracking_number}`,
      });
      onCreated?.(s.tracking_number ?? '');
      refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo generar la guía', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {shipments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-foreground text-xs flex items-center gap-1.5"><Truck className="h-3 w-3" /> Guías generadas</Label>
          <div className="space-y-1.5">
            {shipments.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.carrier} <span className="text-muted-foreground font-normal">· {s.service_level}</span></p>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">{s.tracking_number}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">${Number(s.cost).toFixed(0)}</Badge>
                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px]">Rastrear ↗</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 w-full">
        <PackageCheck className="h-3.5 w-3.5" /> Generar guía de envío
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="text-foreground">Generar Guía de Envío</DialogTitle></DialogHeader>
          {providers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No hay proveedores activos. Activa uno en <strong className="text-foreground">Guías de Envío</strong>.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-foreground">Proveedor</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {providers.map(p => <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-foreground">Servicio</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="standard">Estándar</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Peso (kg)</Label>
                  <Input type="number" min="0.1" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="bg-muted border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Código postal destino</Label>
                <Input value={postal} onChange={e => setPostal(e.target.value)} className="bg-muted border-border" placeholder="06700" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Si el proveedor tiene API key configurada, se cotiza y emite con el carrier real. Sin API key se simula con un número de guía válido.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={generate} disabled={loading || providers.length === 0} className="bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackageCheck className="h-4 w-4 mr-2" />}
              Generar guía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GenerateLabelButton;

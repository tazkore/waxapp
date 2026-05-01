import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface CheckoutOptions {
  allow_guest: boolean;
  require_phone: boolean;
  require_rfc: boolean;
  require_birthdate: boolean;
  min_age: number;
  min_purchase: number;
  enable_coupons: boolean;
  enable_notes: boolean;
  enable_gift: boolean;
}

const empty: CheckoutOptions = {
  allow_guest: true, require_phone: true, require_rfc: false, require_birthdate: true,
  min_age: 18, min_purchase: 0, enable_coupons: true, enable_notes: true, enable_gift: false,
};

const SettingsCheckoutOptions = () => {
  const [data, setData] = useState<CheckoutOptions>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('checkout_options', empty).then((v) => { setData({ ...empty, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('checkout_options', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Opciones del checkout actualizadas.' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const Toggle = ({ k, label, desc }: { k: keyof CheckoutOptions; label: string; desc?: string }) => (
    <div className="flex items-center justify-between border border-border rounded-md p-3">
      <div className="min-w-0">
        <Label className="text-foreground">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={!!data[k]} onCheckedChange={(v) => setData({ ...data, [k]: v })} />
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-foreground">Opciones del checkout</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle k="allow_guest" label="Permitir compra como invitado" />
          <Toggle k="require_phone" label="Teléfono obligatorio" />
          <Toggle k="require_rfc" label="Solicitar RFC" desc="Para facturación opcional" />
          <Toggle k="require_birthdate" label="Solicitar fecha de nacimiento" desc="Validación de edad" />
          <Toggle k="enable_coupons" label="Permitir cupones de descuento" />
          <Toggle k="enable_notes" label="Notas del cliente" />
          <Toggle k="enable_gift" label="Opción de regalo" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Edad mínima</Label>
            <Input type="number" value={data.min_age} onChange={(e) => setData({ ...data, min_age: Number(e.target.value) })} className="bg-muted border-border" />
          </div>
          <div className="space-y-2">
            <Label>Compra mínima ($MXN)</Label>
            <Input type="number" value={data.min_purchase} onChange={(e) => setData({ ...data, min_purchase: Number(e.target.value) })} className="bg-muted border-border" />
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsCheckoutOptions;

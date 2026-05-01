import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface CheckoutMessages {
  header: string;
  footer: string;
  thank_you: string;
  return_policy: string;
}

const empty: CheckoutMessages = {
  header: '',
  footer: 'Tus datos están protegidos.',
  thank_you: '¡Gracias por tu compra! Te enviaremos un correo con el seguimiento.',
  return_policy: 'Devoluciones aceptadas dentro de 30 días.',
};

const SettingsCheckoutMessages = () => {
  const [data, setData] = useState<CheckoutMessages>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('checkout_messages', empty).then((v) => { setData({ ...empty, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('checkout_messages', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Mensajes actualizados.' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const Field = ({ k, label, rows = 3 }: { k: keyof CheckoutMessages; label: string; rows?: number }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} rows={rows} className="bg-muted border-border" />
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-foreground">Mensajes para clientes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field k="header" label="Mensaje en la cabecera del checkout" rows={2} />
        <Field k="footer" label="Mensaje en el pie del checkout" rows={2} />
        <Field k="thank_you" label="Mensaje de agradecimiento (post-pago)" rows={3} />
        <Field k="return_policy" label="Política de devoluciones" rows={4} />
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsCheckoutMessages;

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface ContactSettings {
  legal_name: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
}

const empty: ContactSettings = {
  legal_name: '', rfc: '', email: '', phone: '', address: '', city: '', state: '',
  postal_code: '', country: 'México', facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '',
};

const SettingsContact = () => {
  const [data, setData] = useState<ContactSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('contact', empty).then((v) => { setData({ ...empty, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('contact', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Información de contacto actualizada.' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const upd = (k: keyof ContactSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData({ ...data, [k]: e.target.value });

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-foreground">Información de contacto</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Razón social</Label><Input value={data.legal_name} onChange={upd('legal_name')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>RFC</Label><Input value={data.rfc} onChange={upd('rfc')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={data.email} onChange={upd('email')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Teléfono</Label><Input value={data.phone} onChange={upd('phone')} className="bg-muted border-border" /></div>
        </div>
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Textarea value={data.address} onChange={upd('address')} className="bg-muted border-border" rows={2} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2"><Label>Ciudad</Label><Input value={data.city} onChange={upd('city')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Estado</Label><Input value={data.state} onChange={upd('state')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>C.P.</Label><Input value={data.postal_code} onChange={upd('postal_code')} className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>País</Label><Input value={data.country} onChange={upd('country')} className="bg-muted border-border" /></div>
        </div>
        <div className="border-t border-border pt-4">
          <Label className="text-sm font-semibold text-foreground">Redes sociales</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {(['facebook','instagram','twitter','tiktok','youtube'] as const).map((s) => (
              <div key={s} className="space-y-2">
                <Label className="capitalize text-xs">{s}</Label>
                <Input value={data[s]} onChange={upd(s)} placeholder={`https://${s}.com/tu-cuenta`} className="bg-muted border-border" />
              </div>
            ))}
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsContact;

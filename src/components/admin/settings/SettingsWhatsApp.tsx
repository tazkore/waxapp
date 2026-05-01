import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface WhatsAppSettings {
  enabled: boolean;
  phone: string;
  message: string;
  show_mobile: boolean;
  show_desktop: boolean;
  position: 'bottom-right' | 'bottom-left';
}

const empty: WhatsAppSettings = {
  enabled: false, phone: '', message: 'Hola, me gustaría más información.',
  show_mobile: true, show_desktop: true, position: 'bottom-right',
};

const SettingsWhatsApp = () => {
  const [data, setData] = useState<WhatsAppSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('whatsapp', empty).then((v) => { setData({ ...empty, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('whatsapp', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Botón de WhatsApp actualizado.' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground">Botón de WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div><Label className="text-foreground">Activar botón flotante</Label></div>
          <Switch checked={data.enabled} onCheckedChange={(v) => setData({ ...data, enabled: v })} />
        </div>
        <div className="space-y-2">
          <Label>Número (con código de país, sin +)</Label>
          <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="525512345678" className="bg-muted border-border" />
        </div>
        <div className="space-y-2">
          <Label>Mensaje predeterminado</Label>
          <Textarea value={data.message} onChange={(e) => setData({ ...data, message: e.target.value })} rows={2} className="bg-muted border-border" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <Label>Mostrar en mobile</Label>
            <Switch checked={data.show_mobile} onCheckedChange={(v) => setData({ ...data, show_mobile: v })} />
          </div>
          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <Label>Mostrar en desktop</Label>
            <Switch checked={data.show_desktop} onCheckedChange={(v) => setData({ ...data, show_desktop: v })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Posición</Label>
          <Select value={data.position} onValueChange={(v: any) => setData({ ...data, position: v })}>
            <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="bottom-right">Abajo derecha</SelectItem>
              <SelectItem value="bottom-left">Abajo izquierda</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsWhatsApp;

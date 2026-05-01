import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Plus, Trash2, Languages } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface Currency { code: string; symbol: string; rate: number; active: boolean; }
interface LocaleSettings {
  default_language: string;
  default_currency: string;
  show_prices_with_tax: boolean;
  currencies: Currency[];
}

const empty: LocaleSettings = {
  default_language: 'es-MX',
  default_currency: 'MXN',
  show_prices_with_tax: true,
  currencies: [
    { code: 'MXN', symbol: '$', rate: 1, active: true },
    { code: 'USD', symbol: 'US$', rate: 0.058, active: false },
  ],
};

const SettingsLocale = () => {
  const [data, setData] = useState<LocaleSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('locale', empty).then((v) => { setData({ ...empty, ...v, currencies: v?.currencies || empty.currencies }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('locale', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Configuración regional actualizada.' });
  };

  const updCur = (i: number, patch: Partial<Currency>) =>
    setData({ ...data, currencies: data.currencies.map((c, idx) => idx === i ? { ...c, ...patch } : c) });

  const addCur = () => setData({ ...data, currencies: [...data.currencies, { code: 'EUR', symbol: '€', rate: 0.054, active: false }] });
  const rmCur = (i: number) => setData({ ...data, currencies: data.currencies.filter((_, idx) => idx !== i) });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2">
        <Languages className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground">Idiomas y monedas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Idioma por defecto</Label>
            <Select value={data.default_language} onValueChange={(v) => setData({ ...data, default_language: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="es-MX">Español (México)</SelectItem>
                <SelectItem value="es-ES">Español (España)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda por defecto</Label>
            <Select value={data.default_currency} onValueChange={(v) => setData({ ...data, default_currency: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {data.currencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <Label>Mostrar precios con impuestos</Label>
            <Switch checked={data.show_prices_with_tax} onCheckedChange={(v) => setData({ ...data, show_prices_with_tax: v })} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Monedas activas</Label>
            <Button size="sm" variant="outline" onClick={addCur} className="gap-1"><Plus className="h-3 w-3" /> Agregar</Button>
          </div>
          <div className="border border-border rounded-md divide-y divide-border">
            {data.currencies.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <Input value={c.code} onChange={(e) => updCur(i, { code: e.target.value.toUpperCase() })} placeholder="MXN" className="col-span-3 bg-muted border-border" />
                <Input value={c.symbol} onChange={(e) => updCur(i, { symbol: e.target.value })} placeholder="$" className="col-span-2 bg-muted border-border" />
                <Input type="number" step="0.0001" value={c.rate} onChange={(e) => updCur(i, { rate: Number(e.target.value) })} className="col-span-4 bg-muted border-border" />
                <div className="col-span-2 flex items-center justify-center"><Switch checked={c.active} onCheckedChange={(v) => updCur(i, { active: v })} /></div>
                <Button size="icon" variant="ghost" onClick={() => rmCur(i)} className="col-span-1 h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Tasa relativa a la moneda principal (1 unidad = X de la otra).</p>
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsLocale;

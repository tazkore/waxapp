import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Code } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSetting, setSetting } from '@/lib/siteSettings';

interface ExternalCodes {
  ga4_id: string;
  gtm_id: string;
  meta_pixel_id: string;
  hotjar_id: string;
  head_html: string;
  body_html: string;
}

const empty: ExternalCodes = {
  ga4_id: '', gtm_id: '', meta_pixel_id: '', hotjar_id: '', head_html: '', body_html: '',
};

const SettingsExternalCodes = () => {
  const [data, setData] = useState<ExternalCodes>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('external_codes', empty).then((v) => { setData({ ...empty, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting('external_codes', data);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: 'Códigos externos actualizados.' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2">
        <Code className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground">Códigos externos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Google Analytics 4 ID</Label><Input value={data.ga4_id} onChange={(e) => setData({ ...data, ga4_id: e.target.value })} placeholder="G-XXXXXXXXXX" className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Google Tag Manager ID</Label><Input value={data.gtm_id} onChange={(e) => setData({ ...data, gtm_id: e.target.value })} placeholder="GTM-XXXXXXX" className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Meta Pixel ID</Label><Input value={data.meta_pixel_id} onChange={(e) => setData({ ...data, meta_pixel_id: e.target.value })} placeholder="123456789012345" className="bg-muted border-border" /></div>
          <div className="space-y-2"><Label>Hotjar Site ID</Label><Input value={data.hotjar_id} onChange={(e) => setData({ ...data, hotjar_id: e.target.value })} placeholder="3xxxxxx" className="bg-muted border-border" /></div>
        </div>
        <div className="space-y-2">
          <Label>HTML personalizado en {'<head>'}</Label>
          <Textarea value={data.head_html} onChange={(e) => setData({ ...data, head_html: e.target.value })} rows={5} className="bg-muted border-border font-mono text-xs" placeholder="<!-- scripts, meta, link rel=preconnect, etc. -->" />
        </div>
        <div className="space-y-2">
          <Label>HTML personalizado al inicio de {'<body>'}</Label>
          <Textarea value={data.body_html} onChange={(e) => setData({ ...data, body_html: e.target.value })} rows={5} className="bg-muted border-border font-mono text-xs" placeholder="<!-- ej. <noscript> de Pixel/GTM -->" />
        </div>
        <p className="text-xs text-muted-foreground">⚠️ Los scripts personalizados se inyectan en producción. Valida que sean de fuentes confiables.</p>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
};

export default SettingsExternalCodes;

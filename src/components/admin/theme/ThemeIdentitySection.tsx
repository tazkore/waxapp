import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ThemeIdentitySection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('theme_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setData(data ?? {});
        setLoading(false);
      });
  }, []);

  const upload = async (field: string, file: File) => {
    setUploading(field);
    try {
      const ext = file.name.split('.').pop();
      const path = `theme/${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      setData({ ...data, [field]: pub.publicUrl });
      toast({ title: 'Imagen cargada', description: 'Recuerda guardar los cambios' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        site_name: data.site_name || 'WAXAPP',
        tagline: data.tagline,
        logo_url: data.logo_url,
        logo_dark_url: data.logo_dark_url,
        favicon_url: data.favicon_url,
        og_image_url: data.og_image_url,
        is_active: true,
      };
      const op = data.id
        ? supabase.from('theme_settings').update(payload).eq('id', data.id)
        : supabase.from('theme_settings').insert(payload).select().single();
      const { data: saved, error } = await op;
      if (error) throw error;
      if (saved && !data.id) setData({ ...data, ...saved });
      toast({ title: '✅ Identidad actualizada' });
    } catch (e: any) {
      toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const ImageField = ({ field, label, hint }: { field: string; label: string; hint?: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
          {data?.[field] ? (
            <img src={data[field]} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={data?.[field] ?? ''}
            onChange={(e) => setData({ ...data, [field]: e.target.value })}
            placeholder="URL de la imagen"
          />
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])}
            />
            <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-border bg-background hover:bg-muted cursor-pointer">
              {uploading === field ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Subir archivo
            </span>
          </label>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Identidad del sitio</h3>
          <p className="text-sm text-muted-foreground">Logo, favicon y datos básicos. Los cambios se aplican al instante.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre del sitio</Label>
            <Input value={data?.site_name ?? ''} onChange={(e) => setData({ ...data, site_name: e.target.value })} />
          </div>
          <div>
            <Label>Tagline / Eslogan</Label>
            <Input value={data?.tagline ?? ''} onChange={(e) => setData({ ...data, tagline: e.target.value })} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <ImageField field="logo_url" label="Logo principal" hint="Se mostrará en el Navbar y emails" />
          <ImageField field="logo_dark_url" label="Logo modo oscuro (opcional)" />
          <ImageField field="favicon_url" label="Favicon" hint="Recomendado: 32x32 o 64x64 px (.png o .ico)" />
          <ImageField field="og_image_url" label="Imagen Open Graph" hint="Para compartir en redes (1200x630)" />
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar identidad
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeIdentitySection;

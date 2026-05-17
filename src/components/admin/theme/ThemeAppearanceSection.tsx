import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Palette, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Convert "h s% l%" string to hex for the color picker, and back
const hslToHex = (hsl: string): string => {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return '#000000';
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const FIELDS = [
  { key: 'color_primary', label: 'Color primario', desc: 'Botones, acentos, links' },
  { key: 'color_secondary', label: 'Color secundario', desc: 'CTAs alternativos' },
  { key: 'color_background', label: 'Fondo', desc: 'Color base del sitio' },
  { key: 'color_foreground', label: 'Texto', desc: 'Color principal del texto' },
  { key: 'color_accent', label: 'Acento', desc: 'Hovers y áreas destacadas' },
];

const FONTS = ['Inter', 'Space Grotesk', 'Roboto', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Playfair Display', 'Bebas Neue'];

const ThemeAppearanceSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('theme_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        setData(data ?? {});
        setLoading(false);
        if (data) {
          const varMap: Record<string, string> = {
            color_primary: '--primary',
            color_secondary: '--secondary',
            color_background: '--background',
            color_foreground: '--foreground',
            color_accent: '--accent',
          };
          Object.entries(varMap).forEach(([dbKey, cssVar]) => {
            if ((data as any)[dbKey]) document.documentElement.style.setProperty(cssVar, (data as any)[dbKey]);
          });
        }
      });
  }, []);

  const previewColor = (key: string, value: string) => {
    setData({ ...data, [key]: value });
    // Live preview
    const cssVar = key.replace('color_', '--');
    document.documentElement.style.setProperty(cssVar, value);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        color_primary: data.color_primary,
        color_secondary: data.color_secondary,
        color_background: data.color_background,
        color_foreground: data.color_foreground,
        color_accent: data.color_accent,
        font_heading: data.font_heading,
        font_body: data.font_body,
        custom_css: data.custom_css,
        is_active: true,
      };
      const op = data.id
        ? supabase.from('theme_settings').update(payload).eq('id', data.id)
        : supabase.from('theme_settings').insert(payload);
      const { error } = await op;
      if (error) throw error;
      toast({ title: '✅ Apariencia actualizada' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Paleta de colores</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {FIELDS.map((f) => {
              const value = data?.[f.key] ?? '';
              const hex = value ? hslToHex(value) : '#000000';
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => previewColor(f.key, hexToHsl(e.target.value))}
                      className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={value}
                      onChange={(e) => previewColor(f.key, e.target.value)}
                      placeholder="145 100% 45%"
                      className="font-mono text-xs flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Tipografía</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Fuente para títulos</Label>
              <select
                value={data?.font_heading ?? 'Space Grotesk'}
                onChange={(e) => setData({ ...data, font_heading: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1.5"
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label>Fuente para texto</Label>
              <select
                value={data?.font_body ?? 'Inter'}
                onChange={(e) => setData({ ...data, font_body: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1.5"
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold text-foreground">CSS personalizado (avanzado)</h3>
          <Textarea
            value={data?.custom_css ?? ''}
            onChange={(e) => setData({ ...data, custom_css: e.target.value })}
            placeholder=".my-class { color: red; }"
            className="font-mono text-xs min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">Se inyecta globalmente. Úsalo solo si sabes lo que haces.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar apariencia
        </Button>
      </div>
    </div>
  );
};

export default ThemeAppearanceSection;

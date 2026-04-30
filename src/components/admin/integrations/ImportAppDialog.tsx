import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseAppFile, PortableAppFile } from '@/lib/appPortability';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

const ImportAppDialog = ({ open, onOpenChange, onImported }: Props) => {
  const [parsed, setParsed] = useState<PortableAppFile | null>(null);
  const [slugOverride, setSlugOverride] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setParsed(null);
    setSlugOverride('');
    setError(null);
  };

  const handleFile = async (file: File) => {
    setError(null);
    const text = await file.text();
    const res = parseAppFile(text);
    if (!res.ok) {
      setError(res.error);
      setParsed(null);
      return;
    }
    setParsed(res.data);
    setSlugOverride(res.data.app.slug);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const finalSlug = slugOverride.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      // Verificar conflicto de slug
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();
      if (existing) {
        setError(`Ya existe una app con slug "${finalSlug}". Cámbialo y vuelve a intentar.`);
        setSaving(false);
        return;
      }
      const a = parsed.app;
      const { error: insErr } = await supabase.from('integrations').insert({
        name: a.name,
        slug: finalSlug,
        description: a.description,
        category: a.category,
        api_docs_url: a.api_docs_url,
        version: a.version || '1.0.0',
        schema_version: a.schema_version || 1,
        credential_schema: a.credential_schema as never,
        validation: (a.validation || { kind: 'none' }) as never,
        is_custom: true,
        is_installed: false,
        is_active: false,
        config: {} as never,
      });
      if (insErr) throw insErr;
      toast({ title: '✓ App importada', description: `${a.name} está disponible.` });
      onImported?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Importar app desde JSON
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sube un archivo <code className="font-mono">.wax-app.json</code> exportado desde otra instalación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Archivo</Label>
            <Input
              type="file"
              accept="application/json,.json"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="text-xs"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md text-xs bg-destructive/10 text-destructive border border-destructive/30">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {parsed && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="text-sm font-medium">{parsed.app.name}</p>
              </div>
              <div>
                <Label className="text-xs">Slug (puedes cambiarlo)</Label>
                <Input
                  value={slugOverride}
                  onChange={(e) => setSlugOverride(e.target.value)}
                  className="font-mono text-xs h-8 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Categoría</p>
                  <p className="capitalize">{parsed.app.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Schema v</p>
                  <p>{parsed.app.schema_version}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Campos</p>
                  <p>{Array.isArray(parsed.app.credential_schema) ? (parsed.app.credential_schema as unknown[]).length : 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || !slugOverride.trim() || saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportAppDialog;

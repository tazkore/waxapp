import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCatalog } from '@/lib/integrationsCatalog';
import { useToast } from '@/hooks/use-toast';

interface AppLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_docs_url: string | null;
  config: Record<string, unknown>;
}

interface Props {
  app: AppLite | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected?: () => void;
}

const ConnectAppDialog = ({ app, open, onOpenChange, onConnected }: Props) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const catalog = app ? getCatalog(app.slug) : { fields: [] };

  useEffect(() => {
    if (app && open) {
      const cfg = (app.config || {}) as Record<string, unknown>;
      const existing = (cfg.api_keys || {}) as Record<string, string>;
      const init: Record<string, string> = {};
      catalog.fields.forEach((f) => { init[f.key] = existing[f.key] || ''; });
      setValues(init);
      setResult(null);
    }
  }, [app, open]);

  if (!app) return null;

  const handleSave = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-integration-connection', {
        body: { slug: app.slug, credentials: values },
      });
      if (error) throw error;
      const res = data as { ok: boolean; message: string };
      setResult(res);
      if (res.ok) {
        const newConfig = { ...(app.config || {}), api_keys: values };
        const { error: upErr } = await supabase
          .from('integrations')
          .update({ config: newConfig as any, is_installed: true, is_active: true })
          .eq('id', app.id);
        if (upErr) throw upErr;
        toast({ title: '✓ Conectado', description: `${app.name} está activo.` });
        onConnected?.();
        setTimeout(() => onOpenChange(false), 800);
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Conectar {app.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pega aquí tus credenciales de producción para habilitar la sincronización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {catalog.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-xs font-medium">{field.label}</Label>
              <Input
                id={field.key}
                type={field.type === 'password' ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="font-mono text-xs"
                autoComplete="off"
              />
              {field.helper && <p className="text-[10px] text-muted-foreground">{field.helper}</p>}
            </div>
          ))}

          {app.api_docs_url && (
            <a
              href={app.api_docs_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              ¿Dónde encuentro estas claves? <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {result && (
            <div
              className={`flex items-start gap-2 p-3 rounded-md text-xs ${
                result.ok ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'
              }`}
            >
              {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={testing}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={testing || catalog.fields.some((f) => !values[f.key])}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-shadow hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          >
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Probar Conexión y Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectAppDialog;

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Zap, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCatalog } from '@/lib/integrationsCatalog';
import { useToast } from '@/hooks/use-toast';
import TestConnectionPanel, { TestStatus, TestResultPayload } from './TestConnectionPanel';
import { migrateCredentials, SchemaField } from '@/lib/schemaVersioning';

interface AppLite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_docs_url: string | null;
  config: Record<string, unknown>;
  credential_schema?: unknown;
  validation?: unknown;
  schema_version?: number;
}

interface Props {
  app: AppLite | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected?: () => void;
}

const ConnectAppDialog = ({ app, open, onOpenChange, onConnected }: Props) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<TestStatus>('idle');
  const [result, setResult] = useState<TestResultPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<{ from: number; to: number } | null>(null);
  const { toast } = useToast();

  const catalog = app ? getCatalog(app.slug, app.credential_schema) : { fields: [] };
  const schemaFields = catalog.fields as SchemaField[];

  // No-op validation = guardado directo permitido sin test previo
  const validationKind = useMemo(() => {
    const v = (app?.validation as { kind?: string } | undefined)?.kind;
    return v || 'none';
  }, [app]);

  useEffect(() => {
    if (app && open) {
      const cfg = (app.config || {}) as Record<string, unknown>;
      const existing = (cfg.api_keys || {}) as Record<string, string>;
      const { values: migrated } = migrateCredentials(schemaFields, existing);
      setValues(migrated);

      const usedVersion = (cfg.schema_version_used as number | undefined) || 1;
      const currentVersion = app.schema_version || 1;
      if (currentVersion > usedVersion && Object.keys(existing).length > 0) {
        setMigrationNotice({ from: usedVersion, to: currentVersion });
      } else {
        setMigrationNotice(null);
      }
      setStatus('idle');
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, open]);

  if (!app) return null;

  const fieldErrors = result?.field_errors || {};

  const handleChange = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    // Cambiar credenciales invalida el resultado anterior
    if (status !== 'idle') {
      setStatus('idle');
      setResult(null);
    }
  };

  const handleTest = async () => {
    setStatus('testing');
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-integration-connection', {
        body: { slug: app.slug, credentials: values },
      });
      if (error) throw error;
      const res = data as TestResultPayload;
      setResult(res);
      setStatus(res.ok ? 'ok' : 'error');
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Error de red.' });
      setStatus('error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...(app.config || {}),
        api_keys: values,
        schema_version_used: app.schema_version || 1,
        last_tested_at: new Date().toISOString(),
        last_test_ok: status === 'ok',
      };
      const { error: upErr } = await supabase
        .from('integrations')
        .update({ config: newConfig as never, is_installed: true, is_active: true })
        .eq('id', app.id);
      if (upErr) throw upErr;
      toast({ title: '✓ Conectado', description: `${app.name} está activo.` });
      onConnected?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Error al guardar',
        description: e instanceof Error ? e.message : 'No se pudo guardar.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const requiredMissing = schemaFields.some((f) => f.required !== false && !values[f.key]);
  const canSave = !requiredMissing && (validationKind === 'none' || status === 'ok');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Conectar {app.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pega aquí tus credenciales, prueba la conexión y luego guárdalas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {migrationNotice && (
            <div className="flex items-start gap-2 p-3 rounded-md text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Esta app fue actualizada (v{migrationNotice.from} → v{migrationNotice.to}).
                Revisa los campos y vuelve a probar la conexión.
              </span>
            </div>
          )}

          {schemaFields.map((field) => {
            const err = fieldErrors[field.key];
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-xs font-medium">
                  {field.label}
                  {field.required !== false && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <Input
                  id={field.key}
                  type={field.type === 'password' ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={`font-mono text-xs ${err ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  autoComplete="off"
                />
                {err && <p className="text-[10px] text-destructive">{err}</p>}
                {!err && field.helper && <p className="text-[10px] text-muted-foreground">{field.helper}</p>}
              </div>
            );
          })}

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

          <TestConnectionPanel status={status} result={result} />
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={status === 'testing' || saving}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={status === 'testing' || requiredMissing || saving}
          >
            {status === 'testing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Probar conexión
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saving || status === 'testing'}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-shadow hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            title={canSave ? 'Guardar credenciales' : 'Prueba la conexión primero'}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectAppDialog;

import { CheckCircle2, AlertCircle, Loader2, Clock, Activity } from 'lucide-react';

export type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

export interface TestResultPayload {
  ok: boolean;
  message: string;
  status?: number;
  latency_ms?: number;
  field_errors?: Record<string, string>;
  details?: string;
}

interface Props {
  status: TestStatus;
  result: TestResultPayload | null;
}

const TestConnectionPanel = ({ status, result }: Props) => {
  if (status === 'idle') {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Aún no se ha probado la conexión. Pulsa <strong>Probar conexión</strong> antes de guardar.
      </div>
    );
  }

  if (status === 'testing') {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Validando con el proveedor…
      </div>
    );
  }

  if (!result) return null;

  const tone = result.ok
    ? 'border-primary/30 bg-primary/10 text-primary'
    : 'border-destructive/30 bg-destructive/10 text-destructive';

  return (
    <div className={`rounded-md border p-3 text-xs space-y-2 ${tone}`}>
      <div className="flex items-start gap-2">
        {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
        <div className="flex-1">
          <p className="font-medium">{result.message}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] opacity-80">
            {typeof result.status === 'number' && (
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3" /> HTTP {result.status}
              </span>
            )}
            {typeof result.latency_ms === 'number' && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {result.latency_ms} ms
              </span>
            )}
          </div>
        </div>
      </div>
      {result.details && (
        <details className="text-[10px] opacity-90">
          <summary className="cursor-pointer">Ver respuesta del proveedor</summary>
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words bg-background/50 p-2 rounded">
            {result.details}
          </pre>
        </details>
      )}
    </div>
  );
};

export default TestConnectionPanel;

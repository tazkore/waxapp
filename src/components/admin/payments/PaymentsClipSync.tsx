import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, ArrowDownUp, RotateCw, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  ok: boolean;
  run_id: string | null;
  mode: string;
  since: string;
  until: string;
  status: string;
  total_remote: number;
  upserts: number;
  inserted: number;
  updated: number;
  discrepancies_count: number;
  discrepancies: Array<{
    transaction_id: string;
    external_id: string;
    local_status: string;
    remote_status: string;
    local_amount: number;
    remote_amount: number;
  }>;
  last_offset: number | null;
  last_cursor: string | null;
  synced_at: string;
}

interface SyncRun {
  id: string;
  mode: string;
  since: string | null;
  until: string | null;
  status: string;
  total_remote: number;
  upserts: number;
  discrepancies_count: number;
  attempts: number;
  last_offset: number | null;
  last_cursor: string | null;
  error_message: string | null;
  parent_run_id: string | null;
  started_at: string;
  finished_at: string | null;
}

const isoLocal = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 16);

const statusBadge = (s: string) => {
  if (s === 'success') return <Badge className="bg-green-500/15 text-green-500 border-green-500/30">Exitoso</Badge>;
  if (s === 'failed') return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Fallido</Badge>;
  if (s === 'partial') return <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">Parcial</Badge>;
  if (s === 'running') return <Badge variant="outline">En curso</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

const PaymentsClipSync = () => {
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [since, setSince] = useState(isoLocal(1));
  const [until, setUntil] = useState(new Date().toISOString().slice(0, 16));
  const [result, setResult] = useState<SyncResult | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);

  const loadRuns = useCallback(async () => {
    const { data } = await supabase
      .from('clip_sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(15);
    setRuns((data ?? []) as SyncRun[]);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const runSync = async (
    mode: 'manual' | 'cron' = 'manual',
    extra: { retry_run_id?: string } = {}
  ) => {
    if (extra.retry_run_id) setRetryingId(extra.retry_run_id);
    else setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        mode,
        since: new Date(since).toISOString(),
        until: new Date(until).toISOString(),
      };
      if (extra.retry_run_id) payload.retry_run_id = extra.retry_run_id;

      const { data, error } = await supabase.functions.invoke('clip-sync-payments', { body: payload });
      if (error) throw error;
      const r = data as SyncResult;
      setResult(r);
      if (!r.ok) {
        toast.error(`Sync falló · puedes reintentar desde el historial`);
      } else if (r.status === 'partial') {
        toast.warning(`Sync parcial · ${r.upserts} procesadas, faltan páginas. Reintenta para continuar.`);
      } else {
        toast.success(`Sync OK · ${r.upserts} transacciones · ${r.discrepancies_count} discrepancias`);
      }
      loadRuns();
    } catch (e) {
      toast.error('Error sincronizando: ' + (e as Error).message);
      loadRuns();
    } finally {
      setLoading(false);
      setRetryingId(null);
    }
  };

  const reconcile = async (d: SyncResult['discrepancies'][number]) => {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: d.remote_status,
        amount: d.remote_amount,
        verified_at: new Date().toISOString(),
        notes: `Reconciliado desde Clip (${d.local_status} → ${d.remote_status})`,
      })
      .eq('id', d.transaction_id);
    if (error) return toast.error('No se pudo reconciliar');
    toast.success('Transacción reconciliada con Clip');
    if (result) {
      setResult({
        ...result,
        discrepancies: result.discrepancies.filter((x) => x.transaction_id !== d.transaction_id),
        discrepancies_count: result.discrepancies_count - 1,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" /> Sincronización Clip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => runSync('manual')} disabled={loading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Sincronizar ahora
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Reintentos automáticos (3 intentos con backoff) ante errores 429/5xx de Clip. Si una sync queda parcial o falla, puedes reanudarla desde el último cursor.
          </p>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pagos en Clip</p>
            <p className="text-2xl font-bold">{result.total_remote}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Nuevos</p>
            <p className="text-2xl font-bold text-green-500">{result.inserted}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Actualizados</p>
            <p className="text-2xl font-bold">{result.updated}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Discrepancias</p>
            <p className="text-2xl font-bold text-yellow-500">{result.discrepancies_count}</p>
          </CardContent></Card>
        </div>
      )}

      {result && result.discrepancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" /> Reconciliación de discrepancias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clip ID</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Remoto (Clip)</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.discrepancies.map((d) => (
                  <TableRow key={d.transaction_id}>
                    <TableCell className="font-mono text-xs">{d.external_id}</TableCell>
                    <TableCell><Badge variant="outline">{d.local_status}</Badge></TableCell>
                    <TableCell><Badge>{d.remote_status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      ${d.local_amount} → <strong>${d.remote_amount}</strong>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => reconcile(d)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aplicar Clip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" /> Historial de sincronizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay sincronizaciones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Discrep.</TableHead>
                  <TableHead className="text-right">Intentos</TableHead>
                  <TableHead>Cursor/Offset</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const canRetry = r.status === 'failed' || r.status === 'partial';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.started_at).toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {statusBadge(r.status)}
                          {r.error_message && (
                            <span className="text-xs text-destructive flex items-center gap-1 max-w-[280px] truncate" title={r.error_message}>
                              <XCircle className="h-3 w-3 flex-shrink-0" /> {r.error_message}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.mode}</Badge></TableCell>
                      <TableCell className="text-right">{r.upserts}</TableCell>
                      <TableCell className="text-right">
                        {r.discrepancies_count > 0
                          ? <span className="text-yellow-500">{r.discrepancies_count}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">{r.attempts}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {r.last_cursor ? `cur:${r.last_cursor.slice(0, 10)}…` : `off:${r.last_offset ?? 0}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRetry ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingId === r.id}
                            onClick={() => runSync('manual', { retry_run_id: r.id })}
                          >
                            <RotateCw className={`h-3 w-3 mr-1 ${retryingId === r.id ? 'animate-spin' : ''}`} />
                            Reintentar sync
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsClipSync;

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, ArrowDownUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  ok: boolean;
  mode: string;
  since: string;
  until: string;
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
  synced_at: string;
}

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 16);

const PaymentsClipSync = () => {
  const [loading, setLoading] = useState(false);
  const [since, setSince] = useState(isoDaysAgo(1));
  const [until, setUntil] = useState(new Date().toISOString().slice(0, 16));
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSyncs, setLastSyncs] = useState<SyncResult[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('clip_sync_history');
    if (stored) {
      try { setLastSyncs(JSON.parse(stored).slice(0, 5)); } catch { /* noop */ }
    }
  }, []);

  const runSync = async (mode: 'manual' | 'cron' = 'manual') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('clip-sync-payments', {
        body: {
          mode,
          since: new Date(since).toISOString(),
          until: new Date(until).toISOString(),
        },
      });
      if (error) throw error;
      const r = data as SyncResult;
      setResult(r);
      const next = [r, ...lastSyncs].slice(0, 5);
      setLastSyncs(next);
      localStorage.setItem('clip_sync_history', JSON.stringify(next));
      toast.success(`Sync OK · ${r.upserts} transacciones · ${r.discrepancies_count} discrepancias`);
    } catch (e) {
      toast.error('Error sincronizando: ' + (e as Error).message);
    } finally {
      setLoading(false);
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
            La sincronización automática corre cada hora vía cron. Webhooks en tiempo real ya están activos.
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

      {lastSyncs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> Últimas sincronizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Discrepancias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastSyncs.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{new Date(s.synced_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{s.mode}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.since).toLocaleDateString()} → {new Date(s.until).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{s.upserts}</TableCell>
                    <TableCell className="text-right">
                      {s.discrepancies_count > 0
                        ? <span className="text-yellow-500">{s.discrepancies_count}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentsClipSync;

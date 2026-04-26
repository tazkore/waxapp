import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, RefreshCw, EyeOff, GitMerge, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TxRow {
  id: string;
  external_id: string | null;
  amount: number;
  status: string;
  method: string | null;
  customer_email: string | null;
  customer_name: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
}

interface DuplicateGroup {
  external_id: string;
  rows: TxRow[];
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  failed: 'bg-red-500/15 text-red-500 border-red-500/30',
  ignored: 'bg-muted text-muted-foreground border-border',
  refunded: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
};

const PaymentsClipDuplicates = () => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Traer todas las transacciones de clip con external_id
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id, external_id, amount, status, method, customer_email, customer_name, paid_at, created_at, notes')
        .eq('gateway_slug', 'clip')
        .not('external_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1000);

      if (error) throw error;

      // Agrupar en cliente
      const map = new Map<string, TxRow[]>();
      (data || []).forEach((row) => {
        const key = (row.external_id || '').trim();
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row as TxRow);
      });

      const dupes: DuplicateGroup[] = [];
      map.forEach((rows, external_id) => {
        if (rows.length > 1) dupes.push({ external_id, rows });
      });

      // Ordenar por más recientes primero
      dupes.sort((a, b) => {
        const ad = Math.max(...a.rows.map((r) => new Date(r.created_at).getTime()));
        const bd = Math.max(...b.rows.map((r) => new Date(r.created_at).getTime()));
        return bd - ad;
      });

      setGroups(dupes);
    } catch (e) {
      toast.error('Error cargando duplicados', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleIgnore = async (row: TxRow) => {
    setBusyId(row.id);
    try {
      const note = `[ignorado duplicado @ ${new Date().toISOString()}]${row.notes ? `\n${row.notes}` : ''}`;
      const { error } = await supabase
        .from('payment_transactions')
        .update({ status: 'ignored', notes: note })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Marcado como ignorado');
      await load();
    } catch (e) {
      toast.error('Error', { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleMerge = async (group: DuplicateGroup, keepId: string) => {
    setBusyId(keepId);
    try {
      const keep = group.rows.find((r) => r.id === keepId)!;
      const others = group.rows.filter((r) => r.id !== keepId);

      // Calcular paid_at más temprano disponible
      const paidAts = group.rows.map((r) => r.paid_at).filter(Boolean) as string[];
      const earliestPaid = paidAts.length
        ? paidAts.sort()[0]
        : keep.paid_at;

      // Estado preferido: paid > authorized > pending > otros
      const priority = ['paid', 'authorized', 'pending', 'failed', 'ignored', 'refunded', 'cancelled'];
      const bestStatus = group.rows
        .map((r) => r.status)
        .sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0];

      const mergeNote = `[fusionado de ${others.length} duplicado(s) @ ${new Date().toISOString()}]\nIDs eliminados: ${others.map((o) => o.id).join(', ')}${keep.notes ? `\n---\n${keep.notes}` : ''}`;

      // Actualizar la transacción que se mantiene
      const { error: upErr } = await supabase
        .from('payment_transactions')
        .update({
          status: bestStatus,
          paid_at: earliestPaid,
          notes: mergeNote,
        })
        .eq('id', keep.id);
      if (upErr) throw upErr;

      // Borrar las demás
      const { error: delErr } = await supabase
        .from('payment_transactions')
        .delete()
        .in('id', others.map((o) => o.id));
      if (delErr) throw delErr;

      toast.success(`Fusionados ${others.length + 1} registros en uno`);
      await load();
    } catch (e) {
      toast.error('Error al fusionar', { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" /> Duplicados de Clip
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Transacciones con el mismo <code className="text-xs">external_id</code>. Ignora o fusiona para limpiar el reporte.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Recargar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Analizando...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Copy className="h-10 w-10 mx-auto mb-2 opacity-40" />
              No se encontraron duplicados. ✨
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>
                  <strong>{groups.length}</strong> grupo(s) duplicado(s) — total{' '}
                  <strong>{groups.reduce((acc, g) => acc + g.rows.length, 0)}</strong> registros afectados.
                </span>
              </div>

              {groups.map((g) => (
                <Card key={g.external_id} className="border-amber-500/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {g.external_id}
                        </Badge>
                        <Badge variant="secondary">{g.rows.length} copias</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Creado</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Pagado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString('es-MX')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[r.status] || ''}>
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${Number(r.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.customer_name || r.customer_email || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.paid_at ? new Date(r.paid_at).toLocaleDateString('es-MX') : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyId === r.id || r.status === 'ignored'}
                                  onClick={() => handleIgnore(r)}
                                >
                                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Ignorar
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="default" disabled={busyId === r.id}>
                                      <GitMerge className="h-3.5 w-3.5 mr-1" /> Mantener este
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Fusionar duplicados</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Se mantendrá esta transacción y se eliminarán las otras{' '}
                                        <strong>{g.rows.length - 1}</strong> copias. Se conservará el mejor estado
                                        y la fecha de pago más temprana. Esta acción no se puede deshacer.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleMerge(g, r.id)}>
                                        Fusionar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsClipDuplicates;

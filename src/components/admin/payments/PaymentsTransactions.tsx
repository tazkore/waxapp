import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Check, X, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface AuditEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
  changed_by_email: string | null;
  notes: string | null;
  created_at: string;
}

const FIELD_LABEL: Record<string, string> = {
  status: 'Estado',
  amount: 'Monto',
  net_amount: 'Monto neto',
  fee_amount: 'Comisión',
  created: 'Creación',
};

const fmtVal = (field: string, v: string | null) => {
  if (v === null) return '—';
  if (['amount', 'net_amount', 'fee_amount'].includes(field)) {
    const n = Number(v);
    return isNaN(n) ? v : n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }
  return v;
};

interface Tx {
  id: string;
  gateway_slug: string;
  external_id: string | null;
  reference: string | null;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  method: string | null;
  customer_email: string | null;
  customer_name: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUSES = ['all', 'pending', 'paid', 'authorized', 'refunded', 'failed', 'cancelled', 'disputed'];
const STATUS_VARIANT: Record<string, string> = {
  paid: 'bg-green-500/15 text-green-500 border-green-500/30',
  pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  authorized: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  refunded: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  failed: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  disputed: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
};

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const PaymentsTransactions = () => {
  const [list, setList] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');
  const [gateways, setGateways] = useState<{ slug: string; name: string }[]>([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: gws } = await supabase.from('payment_gateways').select('slug, name').order('display_order');
    setGateways(gws ?? []);

    let q = supabase.from('payment_transactions').select('*').order('created_at', { ascending: false }).limit(500);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (gatewayFilter !== 'all') q = q.eq('gateway_slug', gatewayFilter);
    const { data } = await q;
    setList(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, gatewayFilter]);

  const filtered = list.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.customer_email?.toLowerCase().includes(s) ||
      t.customer_name?.toLowerCase().includes(s) ||
      t.reference?.toLowerCase().includes(s) ||
      t.external_id?.toLowerCase().includes(s)
    );
  });

  const [auditTx, setAuditTx] = useState<Tx | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const openAudit = async (tx: Tx) => {
    setAuditTx(tx);
    setAuditLoading(true);
    setAuditEntries([]);
    const { data, error } = await supabase
      .from('payment_transaction_audit' as any)
      .select('*')
      .eq('transaction_id', tx.id)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setAuditEntries((data as any) ?? []);
    setAuditLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === 'paid') patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from('payment_transactions').update(patch).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Estado actualizado', description: `Transacción marcada como ${status}.` });
    load();
  };

  const exportCsv = () => {
    const rows = [
      ['Fecha', 'Pasarela', 'Estado', 'Cliente', 'Email', 'Monto', 'Comisión', 'Neto', 'Referencia', 'External ID'],
      ...filtered.map(t => [
        new Date(t.paid_at ?? t.created_at).toISOString(),
        t.gateway_slug, t.status, t.customer_name ?? '', t.customer_email ?? '',
        t.amount, t.fee_amount, t.net_amount, t.reference ?? '', t.external_id ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transacciones-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar por cliente, email, referencia…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'Todos los estados' : s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las pasarelas</SelectItem>
            {gateways.map(g => <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto"><Download className="h-4 w-4 mr-2" />CSV</Button>
      </div>

      <div className="rounded border border-border overflow-x-auto">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Sin transacciones.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Pasarela</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-right p-2">Monto</th>
                <th className="text-left p-2">Estado</th>
                <th className="text-left p-2">Ref.</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2 text-xs text-muted-foreground">{new Date(t.paid_at ?? t.created_at).toLocaleString('es-MX')}</td>
                  <td className="p-2 capitalize">{t.gateway_slug.replace('_', ' ')}</td>
                  <td className="p-2">
                    <div className="font-medium">{t.customer_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{t.customer_email ?? ''}</div>
                  </td>
                  <td className="p-2 text-right font-semibold">{fmt(Number(t.amount))}</td>
                  <td className="p-2"><Badge variant="outline" className={STATUS_VARIANT[t.status] ?? ''}>{t.status}</Badge></td>
                  <td className="p-2 font-mono text-xs">{t.reference ?? t.external_id ?? '—'}</td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openAudit(t)} title="Ver historial"><History className="h-4 w-4" /></Button>
                      {t.status === 'pending' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => updateStatus(t.id, 'paid')} title="Marcar como pagado"><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus(t.id, 'cancelled')} title="Cancelar"><X className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={!!auditTx} onOpenChange={(o) => !o && setAuditTx(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historial de transacción</SheetTitle>
            <SheetDescription>
              {auditTx && (
                <span className="font-mono text-xs">{auditTx.reference ?? auditTx.external_id ?? auditTx.id.slice(0, 8)}</span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {auditLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin cambios registrados.</p>
            ) : (
              auditEntries.map(e => (
                <div key={e.id} className="border border-border rounded p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{FIELD_LABEL[e.field_name] ?? e.field_name}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('es-MX')}</span>
                  </div>
                  {e.change_type === 'create' ? (
                    <div className="text-xs">Transacción creada con estado <span className="font-mono">{e.new_value}</span></div>
                  ) : (
                    <div className="text-xs flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-muted-foreground line-through">{fmtVal(e.field_name, e.old_value)}</span>
                      <span>→</span>
                      <span className="font-mono font-medium">{fmtVal(e.field_name, e.new_value)}</span>
                    </div>
                  )}
                  {e.notes && <div className="text-xs text-muted-foreground italic">"{e.notes}"</div>}
                  <div className="text-[11px] text-muted-foreground">Por: {e.changed_by_email ?? 'sistema'}</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PaymentsTransactions;

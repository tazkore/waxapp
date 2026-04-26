import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Check, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Proof {
  id: string;
  transaction_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_by_email: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  payment_transactions?: {
    amount: number;
    customer_name: string | null;
    customer_email: string | null;
    reference: string | null;
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const PaymentsProofs = () => {
  const [list, setList] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payment_proofs')
      .select('*, payment_transactions(amount, customer_name, customer_email, reference)')
      .order('created_at', { ascending: false });
    setList((data ?? []) as Proof[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const review = async (proof: Proof, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    const { error } = await supabase.from('payment_proofs').update({
      status, reviewed_at: new Date().toISOString(),
    }).eq('id', proof.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });

    if (approve) {
      // Marcar la transacción como pagada
      await supabase.from('payment_transactions').update({
        status: 'paid', paid_at: new Date().toISOString(),
      }).eq('id', proof.transaction_id);
    }
    toast({ title: approve ? '✅ Comprobante aprobado' : 'Comprobante rechazado' });
    load();
  };

  const viewFile = async (proof: Proof) => {
    // file_url puede ser una ruta de storage o URL completa
    if (proof.file_url.startsWith('http')) {
      window.open(proof.file_url, '_blank');
      return;
    }
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.file_url, 60);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pending = list.filter(p => p.status === 'pending');
  const reviewed = list.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Pendientes de verificar ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
                <FileText className="h-8 w-8 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.payment_transactions?.customer_name ?? p.uploaded_by_email ?? 'Cliente'}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(Number(p.payment_transactions?.amount ?? 0))} · Ref: {p.payment_transactions?.reference ?? '—'} · {new Date(p.created_at).toLocaleString('es-MX')}
                  </div>
                  {p.notes && <p className="text-xs mt-1 italic">"{p.notes}"</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => viewFile(p)}><ExternalLink className="h-4 w-4 mr-1" />Ver</Button>
                <Button size="sm" className="bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/30" variant="outline" onClick={() => review(p, true)}><Check className="h-4 w-4 mr-1" />Aprobar</Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => review(p, false)}><X className="h-4 w-4 mr-1" />Rechazar</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Historial</h3>
          <div className="space-y-2">
            {reviewed.slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Badge variant="outline" className={p.status === 'approved' ? 'bg-green-500/15 text-green-500 border-green-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>{p.status}</Badge>
                <span className="flex-1 truncate">{p.payment_transactions?.customer_name ?? p.uploaded_by_email}</span>
                <span className="text-xs text-muted-foreground">{fmt(Number(p.payment_transactions?.amount ?? 0))}</span>
                <Button size="sm" variant="ghost" onClick={() => viewFile(p)}><ExternalLink className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsProofs;

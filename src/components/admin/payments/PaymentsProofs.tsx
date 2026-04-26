import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Loader2, FileText, Check, X, ExternalLink, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Proof {
  id: string;
  transaction_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_by_email: string | null;
  status: string;
  notes: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  payment_transactions?: {
    amount: number;
    customer_name: string | null;
    customer_email: string | null;
    reference: string | null;
  };
}

interface PendingTx {
  id: string;
  reference: string | null;
  amount: number;
  customer_name: string | null;
  customer_email: string | null;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const PaymentsProofs = () => {
  const [list, setList] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTxId, setUploadTxId] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Proof | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: proofs }, { data: txs }] = await Promise.all([
      supabase
        .from('payment_proofs')
        .select('*, payment_transactions(amount, customer_name, customer_email, reference)')
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_transactions')
        .select('id, reference, amount, customer_name, customer_email')
        .eq('gateway_slug', 'bank_transfer')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setList((proofs ?? []) as Proof[]);
    setPendingTxs((txs ?? []) as PendingTx[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (proof: Proof) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('payment_proofs').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
      review_notes: 'Aprobado',
    }).eq('id', proof.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });

    await supabase.from('payment_transactions').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      verified_by: user?.id ?? null,
      verified_at: new Date().toISOString(),
    }).eq('id', proof.transaction_id);

    const tx = proof.payment_transactions;
    if (tx?.customer_email) {
      supabase.functions.invoke('notify-payment-proof', {
        body: {
          proof_id: proof.id,
          status: 'approved',
          customer_email: tx.customer_email,
          customer_name: tx.customer_name,
          amount: tx.amount,
          reference: tx.reference,
        },
      }).catch((e) => console.error('notify failed:', e));
    }

    toast({ title: '✅ Comprobante aprobado, notificando al cliente' });
    load();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      return toast({ title: 'Motivo requerido', description: 'Mínimo 5 caracteres.', variant: 'destructive' });
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('payment_proofs').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
      review_notes: reason,
    }).eq('id', rejectTarget.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });

    const tx = rejectTarget.payment_transactions;
    if (tx?.customer_email) {
      supabase.functions.invoke('notify-payment-proof', {
        body: {
          proof_id: rejectTarget.id,
          status: 'rejected',
          reason,
          customer_email: tx.customer_email,
          customer_name: tx.customer_name,
          amount: tx.amount,
          reference: tx.reference,
        },
      }).catch((e) => console.error('notify failed:', e));
    }

    toast({ title: 'Comprobante rechazado, notificando al cliente' });
    setRejectOpen(false);
    setRejectReason('');
    setRejectTarget(null);
    load();
  };

  const viewFile = async (proof: Proof) => {
    if (proof.file_url.startsWith('http')) {
      window.open(proof.file_url, '_blank');
      return;
    }
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.file_url, 60);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadTxId) {
      return toast({ title: 'Falta información', description: 'Selecciona transacción y archivo.', variant: 'destructive' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast({ title: 'Archivo muy grande', description: 'Máx. 10 MB.', variant: 'destructive' });
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${uploadTxId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('payment_proofs').insert({
        transaction_id: uploadTxId,
        file_url: path,
        file_name: file.name,
        file_size: file.size,
        uploaded_by_email: user?.email ?? null,
        notes: uploadNotes.trim() || null,
        status: 'pending',
      });
      if (insErr) throw insErr;

      toast({ title: '✅ Comprobante subido' });
      setUploadOpen(false);
      setUploadTxId(''); setUploadNotes('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e) {
      toast({ title: 'Error al subir', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pending = list.filter(p => p.status === 'pending');
  const reviewed = list.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Pendientes de verificar ({pending.length})</h3>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Subir comprobante
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>
      ) : (
        <div className="space-y-2">
          {pending.map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded border border-border bg-muted/20">
              <FileText className="h-8 w-8 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.payment_transactions?.customer_name ?? p.uploaded_by_email ?? 'Cliente'}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(Number(p.payment_transactions?.amount ?? 0))} · Ref: {p.payment_transactions?.reference ?? '—'} · {new Date(p.created_at).toLocaleString('es-MX')}
                </div>
                {p.notes && <p className="text-xs mt-1 italic">"{p.notes}"</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => viewFile(p)}><ExternalLink className="h-4 w-4 mr-1" />Ver</Button>
              <Button size="sm" className="bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/30" variant="outline" onClick={() => approve(p)}>
                <Check className="h-4 w-4 mr-1" />Verificar
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRejectTarget(p); setRejectOpen(true); }}>
                <X className="h-4 w-4 mr-1" />Rechazar
              </Button>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Historial</h3>
          <div className="space-y-2">
            {reviewed.slice(0, 30).map(p => (
              <div key={p.id} className="p-2 rounded border border-border text-sm space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={p.status === 'approved' ? 'bg-green-500/15 text-green-500 border-green-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                    {p.status === 'approved' ? 'Verificado' : 'Rechazado'}
                  </Badge>
                  <span className="flex-1 truncate">{p.payment_transactions?.customer_name ?? p.uploaded_by_email}</span>
                  <span className="text-xs text-muted-foreground">{fmt(Number(p.payment_transactions?.amount ?? 0))}</span>
                  <span className="text-xs text-muted-foreground">{p.reviewed_at ? new Date(p.reviewed_at).toLocaleString('es-MX') : ''}</span>
                  <Button size="sm" variant="ghost" onClick={() => viewFile(p)}><ExternalLink className="h-3 w-3" /></Button>
                </div>
                {p.review_notes && (
                  <p className="text-xs text-muted-foreground pl-1">
                    <span className="font-medium">Motivo:</span> {p.review_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: subir comprobante */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir comprobante</DialogTitle>
            <DialogDescription>Asocia el comprobante a una transferencia pendiente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Transacción pendiente</Label>
              <Select value={uploadTxId} onValueChange={setUploadTxId}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {pendingTxs.length === 0 && <div className="p-2 text-xs text-muted-foreground">No hay transferencias pendientes.</div>}
                  {pendingTxs.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t.reference ?? t.id.slice(0, 8))} · {fmt(Number(t.amount))} · {t.customer_name ?? t.customer_email ?? '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Archivo (PDF/JPG/PNG, máx 10 MB)</Label>
              <Input ref={fileRef} type="file" accept="image/*,application/pdf" />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} maxLength={500} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadTxId}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: rechazar */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar comprobante</DialogTitle>
            <DialogDescription>Indica el motivo del rechazo. Quedará en el historial.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Ej: monto no coincide / comprobante ilegible / referencia incorrecta…"
            maxLength={500}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={submitReject}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsProofs;

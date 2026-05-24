import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, CreditCard, Loader2, ArrowRight, CheckCircle2, Copy, Building2, Barcode, ExternalLink, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface ClientOrderDetailsSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: 'Pendiente de pago', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', step: 1 },
  paid: { label: 'Pagado', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', step: 2 },
  packed: { label: 'Empacado', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', step: 3 },
  shipped: { label: 'Enviado', color: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30', step: 4 },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-500 border-green-500/30', step: 5 },
  refunded: { label: 'Reembolsado', color: 'bg-destructive/20 text-destructive border-destructive/30', step: 0 },
};

export default function ClientOrderDetailsSheet({ order, open, onOpenChange, onOrderUpdated }: ClientOrderDetailsSheetProps) {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [changingMethod, setChangingMethod] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const status = statusConfig[order?.status] || statusConfig.pending;
  const items = Array.isArray(order?.items) ? order.items : [];
  const isPending = order?.status === 'pending';
  const currentMethod = order?.payment_method || 'card';

  // Load bank accounts if method is transfer
  useEffect(() => {
    if (open && isPending && currentMethod === 'transfer') {
      supabase.from('bank_accounts').select('*').eq('is_active', true).order('display_order')
        .then(({ data }) => setBankAccounts(data || []));
    }
  }, [open, isPending, currentMethod]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    sonnerToast.success('Copiado al portapapeles');
  };

  const oxxoReference = useMemo(() => {
    if (!order?.order_number) return '';
    const cleanNum = order.order_number.replace(/[^A-Z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < cleanNum.length; i++) hash = cleanNum.charCodeAt(i) + ((hash << 5) - hash);
    return \`930012\${Math.abs(hash).toString().padEnd(10, '0').slice(0, 10)}\`;
  }, [order?.order_number]);

  const handlePayWithClip = async () => {
    if (!order) return;
    setLoadingPayment(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('clip-create-checkout', {
        body: {
          order_id: order.id,
          amount: order.total,
          currency: 'MXN',
          reference_number: order.order_number,
          description: \`Pedido WAXAPP \${order.order_number}\`,
          success_url: \`\${origin}/pago-exitoso?folio=\${order.order_number}&order_id=\${order.id}\`,
          cancel_url: \`\${origin}/mi-cuenta\`,
        }
      });
      if (error || !data?.success) throw new Error(data?.error || 'Error al iniciar Clip');
      window.location.href = data.checkout_url;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoadingPayment(false);
    }
  };

  const handleChangePaymentMethod = async (newMethod: string) => {
    if (!order || newMethod === currentMethod) return;
    setChangingMethod(true);
    try {
      const { error } = await supabase.from('orders').update({ payment_method: newMethod }).eq('id', order.id);
      if (error) throw error;
      toast({ title: 'Método actualizado', description: 'Se ha cambiado el método de pago.' });
      onOrderUpdated?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setChangingMethod(false);
    }
  };

  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-background/95 backdrop-blur-xl border-l-border/50">
        <SheetHeader className="pb-6 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                Pedido {order.order_number}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </SheetDescription>
            </div>
            <Badge className={status.color} variant="outline">{status.label}</Badge>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Timeline */}
          {status.step > 0 && (
            <div className="relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: \`\${((status.step - 1) / 4) * 100}%\` }} />
              </div>
              <div className="relative z-10 flex justify-between">
                {['Pendiente', 'Pagado', 'Empacado', 'Enviado', 'Entregado'].map((step, idx) => {
                  const isActive = status.step > idx;
                  const isCurrent = status.step === idx + 1;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors \${
                        isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground border border-border'
                      } \${isCurrent ? 'ring-4 ring-primary/20' : ''}\`}>
                        {isActive ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={\`text-[10px] sm:text-xs font-medium \${isActive ? 'text-foreground' : 'text-muted-foreground'}\`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Action for Pending Orders */}
          {isPending && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
              <div className="p-4 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Acción Requerida: Pago Pendiente</h3>
              </div>
              <div className="p-5 space-y-4">
                {currentMethod === 'card' && (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Tu pago con tarjeta está pendiente o falló. Puedes intentar de nuevo a través de nuestro portal seguro.</p>
                    <Button onClick={handlePayWithClip} disabled={loadingPayment} className="w-full gap-2 shadow-lg shadow-primary/20">
                      {loadingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      Pagar \${order.total.toLocaleString()} MXN con Clip
                    </Button>
                  </div>
                )}
                
                {currentMethod === 'oxxo' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <Barcode className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Pago en OXXO</h4>
                        <p className="text-xs text-muted-foreground">Dicta esta referencia al cajero</p>
                      </div>
                    </div>
                    <div className="bg-background rounded-lg border border-border p-4 text-center relative overflow-hidden">
                      <p className="font-mono text-2xl font-bold tracking-widest text-foreground select-all">{oxxoReference}</p>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(oxxoReference, 'oxxo')} className="mt-2 h-7 text-xs text-muted-foreground">
                        {copiedField === 'oxxo' ? <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        Copiar Referencia
                      </Button>
                      <div className="mt-3 flex justify-center gap-[2px] h-8 opacity-50">
                        {[...Array(30)].map((_, i) => <div key={i} className={\`bg-foreground h-full \${i%3===0?'w-1':i%4===0?'w-1.5':'w-[2px]'}\`} />)}
                      </div>
                    </div>
                  </div>
                )}

                {currentMethod === 'transfer' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Transferencia SPEI</h4>
                        <p className="text-xs text-muted-foreground">Transfiere \${order.total.toLocaleString()} MXN exactos</p>
                      </div>
                    </div>
                    {bankAccounts.length === 0 ? (
                      <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
                    ) : (
                      <div className="space-y-2">
                        {bankAccounts.map(acc => (
                          <div key={acc.id} className="bg-background rounded-lg border border-border p-3 text-xs">
                            <p className="font-semibold text-sm text-foreground">{acc.bank_name}</p>
                            <p className="text-muted-foreground mt-1">Beneficiario: {acc.account_holder}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                              <span className="font-mono font-medium">{acc.clabe}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(acc.clabe, \`clabe-\${acc.id}\`)}>
                                {copiedField === \`clabe-\${acc.id}\` ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Change Payment Method */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 text-center">¿Quieres usar otro método?</p>
                  <div className="flex gap-2 justify-center">
                    {currentMethod !== 'card' && <Button variant="outline" size="sm" onClick={() => handleChangePaymentMethod('card')} disabled={changingMethod} className="text-xs flex-1"><CreditCard className="h-3 w-3 mr-1" /> Tarjeta</Button>}
                    {currentMethod !== 'oxxo' && <Button variant="outline" size="sm" onClick={() => handleChangePaymentMethod('oxxo')} disabled={changingMethod} className="text-xs flex-1"><Barcode className="h-3 w-3 mr-1" /> OXXO</Button>}
                    {currentMethod !== 'transfer' && <Button variant="outline" size="sm" onClick={() => handleChangePaymentMethod('transfer')} disabled={changingMethod} className="text-xs flex-1"><Building2 className="h-3 w-3 mr-1" /> SPEI</Button>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tracking */}
          {order.tracking_number && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Guía de rastreo</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">{order.tracking_number}</p>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(order.tracking_number, 'tracking')}>
                {copiedField === 'tracking' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Items Summary */}
          <div>
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" /> Productos en el pedido
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="p-4 flex gap-4">
                  <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center shrink-0 border border-border/50">
                    <Package className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">{item.title}</p>
                    {item.variant && <p className="text-xs text-muted-foreground mt-1">Variante: {item.variant}</p>}
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-xs text-muted-foreground">Cant: {item.qty} x \${item.price.toLocaleString()}</span>
                      <span className="font-semibold text-sm text-foreground">\${(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal productos</span>
              <span>\${items.reduce((acc: number, i: any) => acc + (i.price * i.qty), 0).toLocaleString()} MXN</span>
            </div>
            {/* If you have shipping stored in order, you can show it, otherwise standard fallback */}
            <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border/50 mt-2">
              <span>Total pagado</span>
              <span className="text-primary">\${order.total.toLocaleString()} MXN</span>
            </div>
          </div>

          {order.shipping_address && (
            <div>
               <h3 className="font-semibold text-sm text-foreground mb-2">Dirección de envío</h3>
               <div className="bg-card border border-border rounded-xl p-4">
                 <p className="text-sm text-muted-foreground leading-relaxed">{order.shipping_address}</p>
               </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, Eye, Search, Clock, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;

const statusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'packed', label: 'Empacado' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'refunded', label: 'Reembolsado' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-secondary/20 text-secondary border-secondary/30',
  packed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-primary/20 text-primary border-primary/30',
  refunded: 'bg-destructive/20 text-destructive border-destructive/30',
  in_transit: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente', packed: 'Empacado', shipped: 'Enviado',
  delivered: 'Entregado', refunded: 'Reembolsado', in_transit: 'En Tránsito',
};

const OrdersSection = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer_name: '', customer_email: '', total: '', shipping_address: '', items_text: '' });

  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredOrders = orders.filter(o =>
    search === '' ||
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  const fetchStatusHistory = async (orderId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    setStatusHistory(data ?? []);
    setHistoryLoading(false);
  };

  const logStatusChange = async (orderId: string, prevStatus: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: user?.email ?? 'unknown',
    } as any);
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setEditAddress(order.shipping_address ?? '');
    setEditStatus(order.status);
    setEditTracking(order.tracking_number ?? '');
    setEditNotes((order as any).admin_notes ?? '');
    setDetailOpen(true);
    fetchStatusHistory(order.id);
  };

  const sendStatusEmail = async (order: Order, newStatus: string, trackingNumber?: string) => {
    const statusMessages: Record<string, { emoji: string; title: string; body: string }> = {
      packed: { emoji: '📦', title: 'Tu pedido está siendo empacado', body: 'Estamos preparando tu pedido con mucho cuidado. Pronto será enviado.' },
      shipped: { emoji: '🚚', title: 'Tu pedido ha sido enviado', body: 'Tu pedido está en camino. Puedes rastrear tu envío con el número de guía proporcionado.' },
      delivered: { emoji: '✅', title: 'Tu pedido ha sido entregado', body: '¡Tu pedido ha llegado! Esperamos que disfrutes tu compra.' },
      refunded: { emoji: '💸', title: 'Tu pedido ha sido reembolsado', body: 'Hemos procesado tu reembolso. El monto será reflejado en tu cuenta en los próximos días.' },
    };

    const msg = statusMessages[newStatus];
    if (!msg) return;

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: order.customer_email,
          subject: `${msg.emoji} ${msg.title} — Pedido ${order.order_number}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
            <div style="text-align:center;margin-bottom:20px">
              <h1 style="color:#8B5CF6;font-size:28px;margin:0">WAXAPP</h1>
              <p style="color:#6b7280;margin:4px 0 0">Actualización de Pedido</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <div style="text-align:center;margin:24px 0">
              <span style="font-size:48px">${msg.emoji}</span>
              <h2 style="color:#1f2937;font-size:20px;margin:12px 0 8px">${msg.title}</h2>
              <p style="color:#4b5563;line-height:1.6;margin:0">${msg.body}</p>
            </div>
            <div style="background:#f3f4f6;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
              <p style="color:#6b7280;font-size:13px;margin:0">Número de pedido</p>
              <p style="color:#8B5CF6;font-size:24px;font-weight:bold;font-family:monospace;margin:4px 0 0">${order.order_number}</p>
            </div>
            ${trackingNumber && newStatus === 'shipped' ? `<div style="background:#faf5ff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #8B5CF6">
              <p style="margin:0;font-size:13px;color:#6b7280"><strong>Número de guía:</strong></p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#1f2937;font-family:monospace">${trackingNumber}</p>
            </div>` : ''}
            <div style="text-align:center;margin:20px 0;padding:12px;background:#f3f4f6;border-radius:8px">
              <span style="font-size:16px;font-weight:bold;color:#1f2937">Total: $${order.total.toLocaleString()} MXN</span>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="color:#9ca3af;font-size:12px;text-align:center">Este correo fue enviado automáticamente por WAXAPP. Si tienes dudas, contáctanos.</p>
          </div>`,
        },
      });
    } catch (e) {
      console.error('Status email error:', e);
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const statusChanged = editStatus !== selectedOrder.status;

    const { error } = await supabase.from('orders').update({
      shipping_address: editAddress || null,
      status: editStatus,
      tracking_number: editTracking || null,
      admin_notes: editNotes || null,
    } as any).eq('id', selectedOrder.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (statusChanged) {
        await logStatusChange(selectedOrder.id, selectedOrder.status, editStatus);
        sendStatusEmail(selectedOrder, editStatus, editTracking);
      }
      setOrders(prev => prev.map(o => o.id === selectedOrder.id
        ? { ...o, shipping_address: editAddress, status: editStatus, tracking_number: editTracking }
        : o
      ));
      toast({ title: 'Pedido actualizado' });
      setDetailOpen(false);
    }
    setSaving(false);
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const { error } = await supabase.from('orders').update({ status: 'refunded' }).eq('id', selectedOrder.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await logStatusChange(selectedOrder.id, selectedOrder.status, 'refunded');
      sendStatusEmail(selectedOrder, 'refunded');
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'refunded' } : o));
      toast({ title: 'Reembolso procesado', description: `Pedido ${selectedOrder.order_number} reembolsado por $${selectedOrder.total.toLocaleString()} MXN` });
      setRefundOpen(false);
      setDetailOpen(false);
    }
    setSaving(false);
  };

  const handleCreateOrder = async () => {
    if (!newOrder.customer_name || !newOrder.customer_email || !newOrder.total) {
      toast({ title: 'Error', description: 'Nombre, email y total son requeridos.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const orderNumber = `WX-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = newOrder.items_text ? newOrder.items_text.split(',').map(i => ({ title: i.trim(), qty: 1, price: 0 })) : [];
    const { error } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_name: newOrder.customer_name,
      customer_email: newOrder.customer_email,
      total: parseFloat(newOrder.total),
      shipping_address: newOrder.shipping_address || null,
      items,
      status: 'pending',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pedido creado', description: `Orden ${orderNumber} creada exitosamente.` });
      setCreateOpen(false);
      setNewOrder({ customer_name: '', customer_email: '', total: '', shipping_address: '', items_text: '' });
      fetchOrders();
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ['Orden', 'Cliente', 'Email', 'Fecha', 'Total', 'Estado', 'Guía', 'Dirección'];
    const rows = filteredOrders.map(o => [
      o.order_number,
      o.customer_name,
      o.customer_email,
      new Date(o.created_at).toLocaleDateString('es-MX'),
      o.total,
      o.status,
      o.tracking_number ?? '',
      (o.shipping_address ?? '').replace(/,/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado', description: `${filteredOrders.length} pedidos exportados a CSV.` });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const items = selectedOrder ? (Array.isArray(selectedOrder.items) ? selectedOrder.items as any[] : []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Pedidos y Envíos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <span className="text-lg leading-none">+</span> Crear Pedido Manual
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por orden, cliente o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-muted border-border" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-muted-foreground">Orden</TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground">Guía</TableHead>
              <TableHead className="text-muted-foreground text-center">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((o) => (
              <TableRow key={o.id} className="border-border cursor-pointer hover:bg-muted/30" onClick={() => openDetail(o)}>
                <TableCell className="font-mono text-sm text-foreground">{o.order_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-foreground font-medium text-sm">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString('es-MX')}</TableCell>
                <TableCell className="text-right text-foreground font-medium">${o.total.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColor[o.status] ?? statusColor.pending}>{statusLabel[o.status] ?? o.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{o.tracking_number ?? '—'}</TableCell>
                <TableCell className="text-center">
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              Pedido {selectedOrder?.order_number}
              {selectedOrder && <Badge className={statusColor[selectedOrder.status] ?? ''}>{statusLabel[selectedOrder.status] ?? selectedOrder.status}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-2">
              {/* Customer & Order Info */}
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="text-foreground font-medium">{selectedOrder.customer_name}</p>
                  <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="text-foreground">{new Date(selectedOrder.created_at).toLocaleString('es-MX')}</p>
                  <p className="text-lg font-bold text-primary">${selectedOrder.total.toLocaleString()} MXN</p>
                </div>
              </div>

              {/* Items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Productos</p>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between px-3 py-2 text-sm">
                        <span className="text-foreground">{item.title} x{item.qty}{item.variant ? ` (${item.variant})` : ''}</span>
                        <span className="text-foreground">${((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Historial de estados
                </p>
                {historyLoading ? (
                  <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : statusHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin cambios de estado registrados.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {statusHistory.map((h: any) => (
                      <div key={h.id} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className={`${statusColor[h.previous_status] ?? 'bg-muted text-muted-foreground'} text-[10px] px-1.5 py-0`}>
                            {statusLabel[h.previous_status] ?? h.previous_status}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className={`${statusColor[h.new_status] ?? 'bg-muted text-muted-foreground'} text-[10px] px-1.5 py-0`}>
                            {statusLabel[h.new_status] ?? h.new_status}
                          </Badge>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-muted-foreground">{h.changed_by}</p>
                          <p className="text-muted-foreground/70">{new Date(h.created_at).toLocaleString('es-MX')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Estado del pedido</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Número de guía</Label>
                    <Input value={editTracking} onChange={e => setEditTracking(e.target.value)} className="bg-muted border-border" placeholder="SKD-00000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Dirección de envío</Label>
                  <Textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} className="bg-muted border-border resize-none" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Notas internas (solo admin)</Label>
                  <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="bg-muted border-border resize-none" rows={3} placeholder="Notas visibles solo para administradores..." />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="destructive" className="sm:mr-auto" onClick={() => setRefundOpen(true)} disabled={selectedOrder?.status === 'refunded'}>
              Emitir Reembolso
            </Button>
            <Button variant="outline" className="border-border" onClick={() => setDetailOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDetail} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Reembolso</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <p className="text-muted-foreground">¿Estás seguro de que deseas emitir un reembolso para el pedido <strong className="text-foreground">{selectedOrder?.order_number}</strong>?</p>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">Monto a reembolsar</p>
              <p className="text-2xl font-bold text-destructive">${selectedOrder?.total.toLocaleString()} MXN</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRefund} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Crear Pedido Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre del cliente *</Label>
                <Input value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} className="bg-muted border-border" placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email del cliente *</Label>
                <Input type="email" value={newOrder.customer_email} onChange={e => setNewOrder(p => ({ ...p, customer_email: e.target.value }))} className="bg-muted border-border" placeholder="cliente@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Total (MXN) *</Label>
              <Input type="number" min="0" step="0.01" value={newOrder.total} onChange={e => setNewOrder(p => ({ ...p, total: e.target.value }))} className="bg-muted border-border" placeholder="1500.00" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Productos (separados por coma)</Label>
              <Input value={newOrder.items_text} onChange={e => setNewOrder(p => ({ ...p, items_text: e.target.value }))} className="bg-muted border-border" placeholder="Producto 1, Producto 2" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Dirección de envío</Label>
              <Textarea value={newOrder.shipping_address} onChange={e => setNewOrder(p => ({ ...p, shipping_address: e.target.value }))} className="bg-muted border-border resize-none" rows={2} placeholder="Calle, Ciudad, Estado, CP" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateOrder} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersSection;

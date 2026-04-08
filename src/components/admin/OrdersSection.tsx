import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;

const statusLabel: Record<string, string> = {
  pending: 'Preparando',
  in_transit: 'En Tránsito',
  delivered: 'Entregado',
};

const statusColor: Record<string, string> = {
  pending: 'bg-secondary/20 text-secondary border-secondary/30',
  in_transit: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivered: 'bg-primary/20 text-primary border-primary/30',
};

const OrdersSection = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else setOrders(data ?? []);
      setLoading(false);
    });
  }, []);

  const generateTracking = async (order: Order) => {
    const tracking = `SKD-${Math.floor(10000 + Math.random() * 90000)}`;
    const { error } = await supabase.from('orders').update({ tracking_number: tracking, status: 'in_transit' }).eq('id', order.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, tracking_number: tracking, status: 'in_transit' } : o));
      toast({ title: 'Guía generada', description: `Guía ${tracking} creada para ${order.order_number}` });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pedidos y Envíos</h1>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-muted-foreground">ID</TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-muted-foreground">Envío</TableHead>
              <TableHead className="text-muted-foreground">Guía</TableHead>
              <TableHead className="text-muted-foreground text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} className="border-border">
                <TableCell className="font-mono text-sm text-muted-foreground">{o.order_number}</TableCell>
                <TableCell className="text-foreground font-medium">{o.customer_name}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right text-foreground">${o.total.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColor[o.status] ?? ''}>{statusLabel[o.status] ?? o.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{o.tracking_number ?? '—'}</TableCell>
                <TableCell className="text-center">
                  <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10"
                    disabled={!!o.tracking_number}
                    onClick={() => generateTracking(o)}>
                    Generar Guía
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersSection;

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ordersData } from '@/data/dashboardData';
import { toast } from '@/hooks/use-toast';

const statusColor: Record<string, string> = {
  Preparando: 'bg-secondary/20 text-secondary border-secondary/30',
  'En Tránsito': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Entregado: 'bg-primary/20 text-primary border-primary/30',
};

const OrdersSection = () => (
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
            <TableHead className="text-muted-foreground">Pago</TableHead>
            <TableHead className="text-muted-foreground">Envío</TableHead>
            <TableHead className="text-muted-foreground">Guía</TableHead>
            <TableHead className="text-muted-foreground text-center">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersData.map((o) => (
            <TableRow key={o.id} className="border-border">
              <TableCell className="font-mono text-sm text-muted-foreground">{o.id}</TableCell>
              <TableCell className="text-foreground font-medium">{o.client}</TableCell>
              <TableCell className="text-muted-foreground">{o.date}</TableCell>
              <TableCell className="text-right text-foreground">${o.total.toLocaleString()}</TableCell>
              <TableCell>
                <Badge className={o.paymentStatus === 'Pagado' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary/20 text-secondary border-secondary/30'}>
                  {o.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={statusColor[o.shippingStatus]}>{o.shippingStatus}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{o.tracking}</TableCell>
              <TableCell className="text-center">
                <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => toast({ title: 'Guía generada', description: `Guía creada para ${o.id}` })}>
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

export default OrdersSection;

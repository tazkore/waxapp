import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const tierLabel: Record<string, string> = { Bronze: 'Bronce', Silver: 'Plata', VIP: 'VIP' };
const tierColor: Record<string, string> = {
  Bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  VIP: 'bg-primary/20 text-primary border-primary/30',
};

const ClientsSection = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('clients').select('*').order('total_spent', { ascending: false }).then(({ data, error }) => {
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else setClients(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Clientes y Programa de Puntos</h1>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground text-right">Total Gastado</TableHead>
                <TableHead className="text-muted-foreground text-right">WAX Points</TableHead>
                <TableHead className="text-muted-foreground">Nivel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="text-foreground font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-right text-foreground">${c.total_spent.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-secondary font-semibold">{c.loyalty_points.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={tierColor[c.membership_tier] ?? ''}>
                      {tierLabel[c.membership_tier] ?? c.membership_tier}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Card className="bg-card border-border h-fit">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Configuración de Puntos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor del Punto</p>
              <p className="text-lg font-bold text-primary">10 Puntos = $1 MXN</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>🥉 Bronce: 0 – 499 pts</p>
              <p>🥈 Plata: 500 – 999 pts</p>
              <p>👑 VIP: 1,000+ pts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientsSection;

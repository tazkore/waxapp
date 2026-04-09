import { useEffect, useState } from 'react';
import { Loader2, Search, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const tierColor: Record<string, string> = {
  Bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  VIP: 'bg-primary/20 text-primary border-primary/30',
};

const ClientsSection = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [noteClient, setNoteClient] = useState<Client | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  // Notes stored locally (in a real app, this would be a DB column)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState('');

  useEffect(() => {
    supabase.from('clients').select('*').order('total_spent', { ascending: false }).then(({ data, error }) => {
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else setClients(data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openNote = (client: Client) => {
    setNoteClient(client);
    setCurrentNote(notes[client.id] ?? '');
    setNoteOpen(true);
  };

  const saveNote = () => {
    if (noteClient) {
      setNotes(prev => ({ ...prev, [noteClient.id]: currentNote }));
      toast({ title: 'Nota guardada' });
      setNoteOpen(false);
    }
  };

  const totalLTV = clients.reduce((sum, c) => sum + Number(c.total_spent), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">CRM y Clientes</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Clientes</p>
            <p className="text-2xl font-bold text-foreground">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">LTV Total</p>
            <p className="text-2xl font-bold text-primary">${totalLTV.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Clientes VIP</p>
            <p className="text-2xl font-bold text-secondary">{clients.filter(c => c.membership_tier === 'VIP').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-muted border-border" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-muted-foreground">Email</TableHead>
              <TableHead className="text-muted-foreground text-right">Total Gastado (LTV)</TableHead>
              <TableHead className="text-muted-foreground text-right">WAX Points</TableHead>
              <TableHead className="text-muted-foreground">Nivel</TableHead>
              <TableHead className="text-muted-foreground text-center">Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="text-foreground font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-right text-foreground font-semibold">${Number(c.total_spent).toLocaleString()}</TableCell>
                <TableCell className="text-right text-secondary font-semibold">{c.loyalty_points.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={tierColor[c.membership_tier] ?? ''}>{c.membership_tier}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary relative" onClick={() => openNote(c)}>
                    <MessageSquare className="h-4 w-4" />
                    {notes[c.id] && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Notes Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Notas — {noteClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={currentNote}
              onChange={e => setCurrentNote(e.target.value)}
              className="bg-muted border-border resize-none"
              rows={4}
              placeholder="Ej: Cliente frecuente, prefiere vapes. Enviar promo de cumpleaños en marzo."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancelar</Button>
            <Button onClick={saveNote} className="bg-primary text-primary-foreground">Guardar Nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsSection;

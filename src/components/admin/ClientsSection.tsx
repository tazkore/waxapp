import { useEffect, useState, useMemo } from 'react';
import { Loader2, Search, MessageSquare, Plus, Pencil, Trash2, Download, Upload, TrendingUp, Users, Crown, DollarSign, CreditCard, Building2 } from 'lucide-react';
import ClientImportDialog from './ClientImportDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WholesaleCreditTab from './WholesaleCreditTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  total_spent: '0',
  loyalty_points: '0',
  membership_tier: 'Bronze',
};

const ClientsSection = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit / Create dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Notes dialog
  const [noteClient, setNoteClient] = useState<Client | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState('');

  // Delete confirm
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

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

  /* ── Create / Edit ── */
  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      total_spent: String(client.total_spent),
      loyalty_points: String(client.loyalty_points),
      membership_tier: client.membership_tier,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Error', description: 'Nombre y email son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      total_spent: parseFloat(form.total_spent) || 0,
      loyalty_points: parseInt(form.loyalty_points) || 0,
      membership_tier: form.membership_tier,
    };

    if (editingClient) {
      const { data, error } = await supabase.from('clients').update(payload).eq('id', editingClient.id).select().single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setClients(prev => prev.map(c => c.id === editingClient.id ? (data as Client) : c));
        toast({ title: 'Cliente actualizado' });
        setEditOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('clients').insert(payload).select().single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setClients(prev => [(data as Client), ...prev]);
        toast({ title: 'Cliente creado' });
        setEditOpen(false);
      }
    }
    setSaving(false);
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteClient) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteClient.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setClients(prev => prev.filter(c => c.id !== deleteClient.id));
      toast({ title: 'Cliente eliminado' });
    }
    setDeleteClient(null);
  };

  /* ── Notes ── */
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

  /* ── Export CSV ── */
  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Total Gastado', 'WAX Points', 'Nivel', 'Último Pedido', 'Creado'];
    const rows = filtered.map(c => [
      c.name, c.email, c.phone ?? '', String(c.total_spent), String(c.loyalty_points),
      c.membership_tier, c.last_order_date ?? '', c.created_at,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalLTV = clients.reduce((sum, c) => sum + Number(c.total_spent), 0);
  const avgLTV = clients.length > 0 ? totalLTV / clients.length : 0;

  const tierDistribution = useMemo(() => {
    const counts: Record<string, number> = { Bronze: 0, Silver: 0, VIP: 0 };
    clients.forEach(c => { counts[c.membership_tier] = (counts[c.membership_tier] || 0) + 1; });
    return counts;
  }, [clients]);

  const newClientsMetrics = useMemo(() => {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d90 = new Date(now.getTime() - 90 * 86400000);
    return {
      last7: clients.filter(c => new Date(c.created_at) >= d7).length,
      last30: clients.filter(c => new Date(c.created_at) >= d30).length,
      last90: clients.filter(c => new Date(c.created_at) >= d90).length,
    };
  }, [clients]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">CRM y Clientes</h1>
      </div>

      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="clientes" className="gap-1.5 data-[state=active]:bg-background"><Users className="h-3.5 w-3.5" /> Clientes</TabsTrigger>
          <TabsTrigger value="credito_mayoreo" className="gap-1.5 data-[state=active]:bg-background"><CreditCard className="h-3.5 w-3.5" /> Crédito Mayoreo</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes">

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Cliente
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Clientes</p>
            <p className="text-2xl font-bold text-foreground">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">LTV Total</p>
            <p className="text-2xl font-bold text-primary">${totalLTV.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">LTV Promedio</p>
            <p className="text-2xl font-bold text-foreground">${avgLTV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Crown className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Clientes VIP</p>
            <p className="text-2xl font-bold text-secondary">{tierDistribution.VIP}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution & New Clients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Distribución por Nivel</p>
            {(['Bronze', 'Silver', 'VIP'] as const).map(tier => {
              const count = tierDistribution[tier] || 0;
              const pct = clients.length > 0 ? (count / clients.length) * 100 : 0;
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{tier}</span>
                    <span className="text-foreground font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${tier === 'VIP' ? 'bg-primary' : tier === 'Silver' ? 'bg-gray-400' : 'bg-orange-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Clientes Nuevos</p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {([['7 días', newClientsMetrics.last7], ['30 días', newClientsMetrics.last30], ['90 días', newClientsMetrics.last90]] as const).map(([label, count]) => (
                <div key={label} className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">Últimos {label}</p>
                </div>
              ))}
            </div>
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
              <TableHead className="text-muted-foreground">Teléfono</TableHead>
              <TableHead className="text-muted-foreground text-right">Total Gastado</TableHead>
              <TableHead className="text-muted-foreground text-right">WAX Points</TableHead>
              <TableHead className="text-muted-foreground">Nivel</TableHead>
              <TableHead className="text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="text-foreground font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                <TableCell className="text-right text-foreground font-semibold">${Number(c.total_spent).toLocaleString()}</TableCell>
                <TableCell className="text-right text-secondary font-semibold">{c.loyalty_points.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={tierColor[c.membership_tier] ?? ''}>{c.membership_tier}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(c)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary relative" onClick={() => openNote(c)} title="Notas">
                      <MessageSquare className="h-4 w-4" />
                      {notes[c.id] && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteClient(c)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron clientes.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted border-border" placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-muted border-border" placeholder="juan@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-muted border-border" placeholder="+52 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Nivel de Membresía</Label>
                <Select value={form.membership_tier} onValueChange={v => setForm({ ...form, membership_tier: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Total Gastado (LTV)</Label>
                <Input type="number" min="0" value={form.total_spent} onChange={e => setForm({ ...form, total_spent: e.target.value })} className="bg-muted border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">WAX Points</Label>
                <Input type="number" min="0" value={form.loyalty_points} onChange={e => setForm({ ...form, loyalty_points: e.target.value })} className="bg-muted border-border" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Eliminar Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-2">¿Estás seguro de que deseas eliminar a <strong className="text-foreground">{deleteClient?.name}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClient(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

        </TabsContent>
        <TabsContent value="credito_mayoreo">
          <WholesaleCreditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientsSection;

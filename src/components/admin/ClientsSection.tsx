import { useEffect, useState, useMemo } from 'react';
import { Loader2, Search, MessageSquare, Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet, TrendingUp, Users, Crown, DollarSign, CreditCard, Building2, Receipt, ShoppingBag, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  total_spent: number;
  loyalty_points: number;
  membership_tier: string;
  last_order_date?: string | null;
  affiliate_ref?: string | null;
  created_at: string;
  updated_at?: string;
}

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

/* Inline editor for WAX Points (admin can manually adjust per client) */
const InlinePointsEditor = ({ client, onUpdate }: { client: Client; onUpdate: (n: number) => void }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(client.loyalty_points));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const n = Math.max(0, parseInt(value) || 0);
    setSaving(true);
    const { error } = await supabase.from('customer_profiles').update({ loyalty_points: n }).eq('id', client.id);
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { onUpdate(n); setEditing(false); toast({ title: 'WAX Points actualizados' }); }
  };
  if (!editing) return (
    <button onClick={() => { setValue(String(client.loyalty_points)); setEditing(true); }} className="text-secondary font-semibold hover:underline">
      {client.loyalty_points.toLocaleString()}
    </button>
  );
  return (
    <div className="flex items-center justify-end gap-1">
      <Input type="number" min={0} value={value} onChange={e => setValue(e.target.value)} className="h-7 w-20 text-right text-xs bg-muted border-border" />
      <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={save} disabled={saving} title="Guardar">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓'}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(false)} title="Cancelar">✕</Button>
    </div>
  );
};

/* ── Payment history dialog ────────────────────── */
interface PaymentTx {
  id: string;
  gateway_slug: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  external_id: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  paid:       { label: 'Pagado',    icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-green-400 bg-green-400/10 border-green-400/30' },
  authorized: { label: 'Autorizado', icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-primary bg-primary/10 border-primary/30' },
  pending:    { label: 'Pendiente', icon: <Clock className="h-3.5 w-3.5" />, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  failed:     { label: 'Fallido',   icon: <XCircle className="h-3.5 w-3.5" />, cls: 'text-destructive bg-destructive/10 border-destructive/30' },
  cancelled:  { label: 'Cancelado', icon: <XCircle className="h-3.5 w-3.5" />, cls: 'text-muted-foreground bg-muted/20 border-border/50' },
  refunded:   { label: 'Reembolso', icon: <Receipt className="h-3.5 w-3.5" />, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
};

const ClientPaymentsDialog = ({ client, onClose }: { client: Client; onClose: () => void }) => {
  const [transactions, setTransactions] = useState<PaymentTx[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    (async () => {
      setLoadingTx(true);
      const { data } = await supabase
        .from('payment_transactions')
        .select('id, gateway_slug, amount, status, method, reference, external_id, paid_at, created_at')
        .eq('customer_email', client.email)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions((data ?? []) as PaymentTx[]);
      setLoadingTx(false);
    })();
  }, [client.email]);

  const filtered = transactions.filter(t => {
    if (tab === 'pending') return ['pending', 'authorized'].includes(t.status);
    if (tab === 'paid') return t.status === 'paid';
    return true;
  });

  const totalPaid = transactions.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const totalPending = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Pagos de {client.name}
            <Badge variant="outline" className="ml-2 text-xs">{client.email}</Badge>
          </DialogTitle>
          <div className="flex gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Cobrado total</p>
              <p className="text-xl font-bold text-primary font-display">${totalPaid.toLocaleString('es-MX')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-xl font-bold text-amber-400 font-display">${totalPending.toLocaleString('es-MX')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Transacciones</p>
              <p className="text-xl font-bold text-foreground font-display">{transactions.length}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          {(['all', 'pending', 'paid'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'all' ? 'Todos' : t === 'pending' ? 'Pendientes' : 'Pagados'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingTx ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sin transacciones{tab !== 'all' ? ' en esta categoría' : ''}</div>
          ) : filtered.map(tx => {
            const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.failed;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/30 transition-colors">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${cfg.cls}`}>
                  {cfg.icon} {cfg.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground capitalize">{tx.gateway_slug}</span>
                    {tx.reference && <span className="text-[10px] text-muted-foreground font-mono truncate">{tx.reference}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.paid_at ?? tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground font-display shrink-0">
                  ${Number(tx.amount).toLocaleString('es-MX')}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
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

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);

  // Payments dialog
  const [paymentsClient, setPaymentsClient] = useState<Client | null>(null);

  const fetchClients = () => {
    setLoading(true);
    supabase.from('customer_profiles').select('*').order('total_spent', { ascending: false }).then(({ data, error }) => {
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else setClients(data ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchClients(); }, []);

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
      const { data, error } = await supabase.from('customer_profiles').update(payload).eq('id', editingClient.id).select().single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setClients(prev => prev.map(c => c.id === editingClient.id ? (data as Client) : c));
        toast({ title: 'Cliente actualizado' });
        setEditOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('customer_profiles').insert(payload).select().single();
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
    const { error } = await supabase.from('customer_profiles').delete().eq('id', deleteClient.id);
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

  /* ── Export XLSX ── */
  const exportXLSX = async () => {
    const XLSX = await import('xlsx');
    const headers = ['Nombre', 'Email', 'Teléfono', 'Total Gastado', 'WAX Points', 'Nivel', 'Último Pedido', 'Creado'];
    const data = filtered.map(c => ({
      Nombre: c.name,
      Email: c.email,
      Teléfono: c.phone ?? '',
      'Total Gastado': Number(c.total_spent),
      'WAX Points': c.loyalty_points,
      Nivel: c.membership_tier,
      'Último Pedido': c.last_order_date ?? '',
      Creado: c.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    // Auto-size columns
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Importar</Button>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
        <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
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
                <TableCell className="text-right">
                  <InlinePointsEditor
                    client={c}
                    onUpdate={(newPts) => setClients(prev => prev.map(x => x.id === c.id ? { ...x, loyalty_points: newPts } : x))}
                  />
                </TableCell>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-400" onClick={() => setPaymentsClient(c)} title="Ver pagos">
                      <Receipt className="h-4 w-4" />
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

      <ClientImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchClients} />

      {paymentsClient && (
        <ClientPaymentsDialog client={paymentsClient} onClose={() => setPaymentsClient(null)} />
      )}

        </TabsContent>
        <TabsContent value="credito_mayoreo">
          <WholesaleCreditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientsSection;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Search, Pencil, Trash2, Building, FileText, Wallet, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───
interface Supplier { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; category: string; address: string | null; notes: string | null; is_active: boolean; created_at: string; }
interface PurchaseOrder { id: string; supplier_id: string | null; order_number: string; items: any; total: number; status: string; expected_delivery: string | null; notes: string | null; created_at: string; }
interface AccountPayable { id: string; supplier_id: string | null; purchase_order_id: string | null; amount: number; due_date: string | null; status: string; payment_date: string | null; notes: string | null; created_at: string; }

const poStatusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Enviada', className: 'bg-blue-500/20 text-blue-400' },
  confirmada: { label: 'Confirmada', className: 'bg-primary/20 text-primary' },
  recibida: { label: 'Recibida', className: 'bg-emerald-500/20 text-emerald-400' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/20 text-destructive' },
};

const apStatusConfig: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-500/20 text-amber-400' },
  pagado: { label: 'Pagado', className: 'bg-primary/20 text-primary' },
  vencido: { label: 'Vencido', className: 'bg-destructive/20 text-destructive' },
};

// ─── Suppliers Tab ───
const SuppliersTab = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', contact_name: '', email: '', phone: '', category: 'general', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetch = async () => { setLoading(true); const { data } = await supabase.from('suppliers').select('*').order('name'); setSuppliers((data || []) as Supplier[]); setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ name: '', contact_name: '', email: '', phone: '', category: 'general', address: '', notes: '' }); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact_name: s.contact_name || '', email: s.email || '', phone: s.phone || '', category: s.category, address: s.address || '', notes: s.notes || '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Error', description: 'Nombre requerido.', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name, contact_name: form.contact_name || null, email: form.email || null, phone: form.phone || null, category: form.category, address: form.address || null, notes: form.notes || null };
    const { error } = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing.id)
      : await supabase.from('suppliers').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editing ? 'Actualizado' : 'Creado' }); setModalOpen(false); fetch(); }
    setSaving(false);
  };

  const toggleActive = async (s: Supplier) => {
    await supabase.from('suppliers').update({ is_active: !s.is_active }).eq('id', s.id);
    fetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>
      </div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader><TableRow className="border-border">
            <TableHead className="text-muted-foreground">Proveedor</TableHead>
            <TableHead className="text-muted-foreground">Contacto</TableHead>
            <TableHead className="text-muted-foreground">Categoría</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground w-[80px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id} className="border-border">
                <TableCell>
                  <div><span className="font-medium text-foreground">{s.name}</span></div>
                  {s.email && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.contact_name || '—'}{s.phone && <span className="flex items-center gap-1 text-[11px]"><Phone className="h-3 w-3" />{s.phone}</span>}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{s.category}</Badge></TableCell>
                <TableCell><Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin proveedores registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Nombre *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Contacto</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Categoría</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Dirección</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Purchase Orders Tab ───
const PurchaseOrdersTab = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', order_number: '', total: '', status: 'borrador', expected_delivery: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetch = async () => {
    setLoading(true);
    const [{ data: o }, { data: s }] = await Promise.all([
      supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
    ]);
    setOrders((o || []) as PurchaseOrder[]);
    setSuppliers((s || []) as Supplier[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const getSupplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name || '—';

  const handleCreate = async () => {
    if (!form.order_number.trim()) { toast({ title: 'Error', description: 'Número de orden requerido.', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('purchase_orders').insert({
      supplier_id: form.supplier_id || null,
      order_number: form.order_number,
      total: Number(form.total) || 0,
      status: form.status,
      expected_delivery: form.expected_delivery || null,
      notes: form.notes || null,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Orden creada' }); setModalOpen(false); setForm({ supplier_id: '', order_number: '', total: '', status: 'borrador', expected_delivery: '', notes: '' }); fetch(); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('purchase_orders').update({ status }).eq('id', id);
    fetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button className="gap-2" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Nueva Orden de Compra</Button></div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader><TableRow className="border-border">
            <TableHead className="text-muted-foreground"># Orden</TableHead>
            <TableHead className="text-muted-foreground">Proveedor</TableHead>
            <TableHead className="text-muted-foreground text-right">Total</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground">Entrega Esperada</TableHead>
            <TableHead className="text-muted-foreground w-[140px]">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map(o => {
              const st = poStatusConfig[o.status] || poStatusConfig.borrador;
              return (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-mono text-foreground">{o.order_number}</TableCell>
                  <TableCell className="text-muted-foreground">{getSupplierName(o.supplier_id)}</TableCell>
                  <TableCell className="text-right font-mono text-foreground">${o.total.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{o.expected_delivery ? new Date(o.expected_delivery).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(poStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
            {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin órdenes de compra.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs"># Orden *</Label><Input placeholder="OC-001" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} className="mt-1" /></div>
              <div>
                <Label className="text-xs">Proveedor</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Total ($)</Label><Input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Entrega Esperada</Label><Input type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Crear Orden</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Accounts Payable Tab ───
const AccountsPayableTab = () => {
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', purchase_order_id: '', amount: '', due_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetch = async () => {
    setLoading(true);
    const [{ data: a }, { data: s }, { data: o }] = await Promise.all([
      supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_orders').select('*').order('order_number'),
    ]);
    setAccounts((a || []) as AccountPayable[]);
    setSuppliers((s || []) as Supplier[]);
    setOrders((o || []) as PurchaseOrder[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const getSupplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name || '—';
  const getOrderNumber = (id: string | null) => orders.find(o => o.id === id)?.order_number || '—';

  const handleCreate = async () => {
    if (!form.amount) { toast({ title: 'Error', description: 'Monto requerido.', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('accounts_payable').insert({
      supplier_id: form.supplier_id || null,
      purchase_order_id: form.purchase_order_id || null,
      amount: Number(form.amount) || 0,
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Cuenta creada' }); setModalOpen(false); setForm({ supplier_id: '', purchase_order_id: '', amount: '', due_date: '', notes: '' }); fetch(); }
    setSaving(false);
  };

  const markPaid = async (id: string) => {
    await supabase.from('accounts_payable').update({ status: 'pagado', payment_date: new Date().toISOString() }).eq('id', id);
    fetch();
  };

  const totalPending = accounts.filter(a => a.status === 'pendiente').reduce((sum, a) => sum + a.amount, 0);
  const totalOverdue = accounts.filter(a => a.status === 'vencido').reduce((sum, a) => sum + a.amount, 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-amber-400" /></div>
          <div><p className="text-xs text-muted-foreground">Por Pagar</p><p className="text-xl font-bold text-amber-400">${totalPending.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Vencido</p><p className="text-xl font-bold text-destructive">${totalOverdue.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex justify-end"><Button className="gap-2" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Nueva Cuenta</Button></div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader><TableRow className="border-border">
            <TableHead className="text-muted-foreground">Proveedor</TableHead>
            <TableHead className="text-muted-foreground">OC</TableHead>
            <TableHead className="text-muted-foreground text-right">Monto</TableHead>
            <TableHead className="text-muted-foreground">Vencimiento</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground w-[100px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {accounts.map(a => {
              const st = apStatusConfig[a.status] || apStatusConfig.pendiente;
              return (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="text-foreground">{getSupplierName(a.supplier_id)}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{getOrderNumber(a.purchase_order_id)}</TableCell>
                  <TableCell className="text-right font-mono text-foreground">${a.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge></TableCell>
                  <TableCell>
                    {a.status === 'pendiente' && (
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => markPaid(a.id)}>Marcar Pagado</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {accounts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin cuentas por pagar.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Proveedor</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Orden de Compra</Label>
                <Select value={form.purchase_order_id} onValueChange={v => setForm({ ...form, purchase_order_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Monto ($) *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Fecha Vencimiento</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Crear Cuenta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Main Section ───
const PurchasingSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compras & Corporativo</h1>
        <p className="text-muted-foreground text-sm">Gestión de proveedores, órdenes de compra y cuentas por pagar.</p>
      </div>
      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="suppliers" className="gap-1.5 data-[state=active]:bg-background"><Building className="h-3.5 w-3.5" /> Proveedores</TabsTrigger>
          <TabsTrigger value="purchase_orders" className="gap-1.5 data-[state=active]:bg-background"><FileText className="h-3.5 w-3.5" /> Órdenes de Compra</TabsTrigger>
          <TabsTrigger value="accounts_payable" className="gap-1.5 data-[state=active]:bg-background"><Wallet className="h-3.5 w-3.5" /> Cuentas por Pagar</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="purchase_orders"><PurchaseOrdersTab /></TabsContent>
        <TabsContent value="accounts_payable"><AccountsPayableTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchasingSection;

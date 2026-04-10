import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, Building2, DollarSign, Search, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WholesaleLead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  estimated_value: number;
  stage: string;
  credit_limit: number;
  credit_status: string;
  credit_terms: string | null;
  created_at: string;
}

const creditStatusConfig: Record<string, { label: string; className: string }> = {
  sin_credito: { label: 'Sin Crédito', className: 'bg-muted text-muted-foreground border-border' },
  en_revision: { label: 'En Revisión', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  aprobado: { label: 'Aprobado', className: 'bg-primary/20 text-primary border-primary/30' },
  rechazado: { label: 'Rechazado', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  suspendido: { label: 'Suspendido', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const WholesaleCreditTab = () => {
  const [leads, setLeads] = useState<WholesaleLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editLead, setEditLead] = useState<WholesaleLead | null>(null);
  const [creditForm, setCreditForm] = useState({ credit_limit: '', credit_status: 'sin_credito', credit_terms: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('wholesale_leads').select('*').order('company_name');
    setLeads((data || []) as WholesaleLead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(l =>
    !search || l.company_name.toLowerCase().includes(search.toLowerCase()) || l.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (lead: WholesaleLead) => {
    setEditLead(lead);
    setCreditForm({
      credit_limit: String(lead.credit_limit || 0),
      credit_status: lead.credit_status || 'sin_credito',
      credit_terms: lead.credit_terms || '',
    });
  };

  const handleSave = async () => {
    if (!editLead) return;
    setSaving(true);
    const { error } = await supabase.from('wholesale_leads').update({
      credit_limit: Number(creditForm.credit_limit) || 0,
      credit_status: creditForm.credit_status,
      credit_terms: creditForm.credit_terms || null,
    }).eq('id', editLead.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' });
    } else {
      toast({ title: 'Actualizado', description: `Crédito de ${editLead.company_name} actualizado.` });
      setEditLead(null);
      fetchLeads();
    }
    setSaving(false);
  };

  const totalCreditApproved = leads.filter(l => l.credit_status === 'aprobado').reduce((sum, l) => sum + l.credit_limit, 0);
  const totalInReview = leads.filter(l => l.credit_status === 'en_revision').length;
  const totalApproved = leads.filter(l => l.credit_status === 'aprobado').length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Clientes Mayoreo</p><p className="text-xl font-bold text-foreground">{leads.length}</p></div>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Crédito Aprobado</p><p className="text-xl font-bold text-primary">{totalApproved}</p><p className="text-[10px] text-muted-foreground">{totalInReview} en revisión</p></div>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Límite Total Aprobado</p><p className="text-xl font-bold text-foreground">${totalCreditApproved.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Empresa</TableHead>
              <TableHead className="text-muted-foreground">Contacto</TableHead>
              <TableHead className="text-muted-foreground">Etapa Pipeline</TableHead>
              <TableHead className="text-muted-foreground">Estado Crédito</TableHead>
              <TableHead className="text-muted-foreground text-right">Límite</TableHead>
              <TableHead className="text-muted-foreground">Términos</TableHead>
              <TableHead className="text-muted-foreground w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(lead => {
              const cs = creditStatusConfig[lead.credit_status] || creditStatusConfig.sin_credito;
              return (
                <TableRow key={lead.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{lead.company_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.contact_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{lead.stage.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${cs.className}`}>{cs.label}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-sm text-foreground">${lead.credit_limit.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.credit_terms || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lead)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay clientes mayoreo registrados. Créalos desde Centro de Operaciones → Pipeline Mayoreo.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Credit Modal */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crédito: {editLead?.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Límite de Crédito ($)</Label><Input type="number" value={creditForm.credit_limit} onChange={e => setCreditForm({ ...creditForm, credit_limit: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={creditForm.credit_status} onValueChange={v => setCreditForm({ ...creditForm, credit_status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(creditStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Términos de Pago</Label><Input placeholder="Ej: Net 30, 50% anticipo..." value={creditForm.credit_terms} onChange={e => setCreditForm({ ...creditForm, credit_terms: e.target.value })} className="mt-1" /></div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WholesaleCreditTab;

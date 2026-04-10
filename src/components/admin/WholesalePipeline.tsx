import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Building2, Phone, Mail, DollarSign, User, ArrowRight, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WholesaleLead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  estimated_value: number;
  stage: string;
  assigned_to: string | null;
  notes: string | null;
  credit_limit: number;
  credit_status: string;
  credit_terms: string | null;
  created_at: string;
}

const STAGES = [
  { key: 'prospecto', label: 'Prospecto', color: 'text-muted-foreground' },
  { key: 'contacto_inicial', label: 'Contacto Inicial', color: 'text-blue-400' },
  { key: 'cotizacion', label: 'Cotización', color: 'text-cyan-400' },
  { key: 'negociacion', label: 'Negociación', color: 'text-amber-400' },
  { key: 'aprobacion_credito', label: 'Aprobación Crédito', color: 'text-orange-400' },
  { key: 'orden_confirmada', label: 'Orden Confirmada', color: 'text-primary' },
  { key: 'entrega_cierre', label: 'Entrega/Cierre', color: 'text-emerald-400' },
];

const STAFF = ['Ana López', 'Carlos Ruiz', 'María García', 'Jorge Mendoza'];

const WholesalePipeline = () => {
  const [leads, setLeads] = useState<WholesaleLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<WholesaleLead | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { company_name: '', contact_name: '', email: '', phone: '', estimated_value: '', stage: 'prospecto', assigned_to: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('wholesale_leads').select('*').order('created_at', { ascending: false });
    if (!error) setLeads((data || []) as WholesaleLead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (lead: WholesaleLead) => {
    setEditingLead(lead);
    setForm({
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: String(lead.estimated_value),
      stage: lead.stage,
      assigned_to: lead.assigned_to || '',
      notes: lead.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim()) {
      toast({ title: 'Error', description: 'Empresa y contacto son requeridos.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      contact_name: form.contact_name,
      email: form.email || null,
      phone: form.phone || null,
      estimated_value: Number(form.estimated_value) || 0,
      stage: form.stage,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
    };

    const { error } = editingLead
      ? await supabase.from('wholesale_leads').update(payload).eq('id', editingLead.id)
      : await supabase.from('wholesale_leads').insert(payload);

    if (error) {
      toast({ title: 'Error', description: editingLead ? 'No se pudo actualizar.' : 'No se pudo crear el lead.', variant: 'destructive' });
    } else {
      toast({ title: editingLead ? 'Lead actualizado' : 'Lead creado', description: `${form.company_name} ${editingLead ? 'actualizado' : 'agregado al pipeline'}.` });
      setForm(emptyForm);
      setEditingLead(null);
      setModalOpen(false);
      fetchLeads();
    }
    setSaving(false);
  };

  const moveLead = async (lead: WholesaleLead, newStage: string) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));
    const { error } = await supabase.from('wholesale_leads').update({ stage: newStage }).eq('id', lead.id);
    if (error) fetchLeads();
  };

  const leadsByStage = (stage: string) => leads.filter(l => l.stage === stage);

  // Bottleneck detection
  const bottleneck = (() => {
    const counts = STAGES.map(s => ({ key: s.key, count: leadsByStage(s.key).length }));
    return counts.reduce((a, b) => b.count > a.count ? b : a, { key: '', count: 0 }).key;
  })();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pipeline de Mayoreo</h2>
          <p className="text-muted-foreground text-sm">Leads de negocios de mayoreo — 7 etapas del embudo.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo Lead
        </Button>
      </div>

      {/* Visual Pipeline */}
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Embudo de Mayoreo</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STAGES.map((stage, i) => {
              const count = leadsByStage(stage.key).length;
              const isBn = stage.key === bottleneck && count > 0;
              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-0">
                  <motion.div
                    className={`flex-1 rounded-lg border-2 px-3 py-2 text-center transition-all ${
                      isBn ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
                    }`}
                    animate={isBn ? { boxShadow: ['0 0 8px rgba(0,230,118,0.1)', '0 0 20px rgba(0,230,118,0.3)', '0 0 8px rgba(0,230,118,0.1)'] } : {}}
                    transition={isBn ? { duration: 2, repeat: Infinity } : {}}
                  >
                    <span className={`text-[10px] font-semibold ${isBn ? 'text-primary' : 'text-muted-foreground'}`}>{stage.label}</span>
                    <p className={`text-lg font-bold ${isBn ? 'text-primary' : 'text-foreground'}`}>{count}</p>
                  </motion.div>
                  {i < STAGES.length - 1 && <ArrowRight className="h-3 w-3 mx-0.5 text-muted-foreground/40 shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leads by Stage — horizontal scroll columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageLeads = leadsByStage(stage.key);
          return (
            <div key={stage.key} className="min-w-[260px] w-[260px] shrink-0 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${stage.color.replace('text-', 'bg-')}`} />
                <h3 className="text-xs font-semibold text-foreground">{stage.label}</h3>
                <Badge variant="secondary" className="text-[10px] ml-auto">{stageLeads.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {stageLeads.map(lead => (
                  <Card key={lead.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">{lead.company_name}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">{lead.contact_name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(lead)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            ${lead.estimated_value.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </div>
                      )}
                      {lead.assigned_to && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="h-3 w-3" /> {lead.assigned_to}
                        </div>
                      )}
                      {/* Move buttons — show prev/next */}
                      <div className="flex gap-1 pt-1">
                        {STAGES.filter(s => s.key !== stage.key).slice(0, 3).map(target => (
                          <Button key={target.key} variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-muted-foreground hover:text-foreground" onClick={() => moveLead(lead, target.key)}>
                            → {target.label.split('/')[0].substring(0, 10)}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingLead(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingLead ? 'Editar Lead' : 'Nuevo Lead de Mayoreo'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Empresa *</Label><Input placeholder="Nombre de empresa" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Contacto *</Label><Input placeholder="Nombre contacto" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" placeholder="email@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Teléfono</Label><Input placeholder="+52..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Valor Estimado ($)</Label><Input type="number" placeholder="0" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} className="mt-1" /></div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Asignar a</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{STAFF.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notas</Label><Textarea placeholder="Detalles..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingLead ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingLead ? 'Guardar Cambios' : 'Crear Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WholesalePipeline;

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Mail, User, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import LeadFormModal, { emptyLeadForm, type LeadFormData } from './LeadFormModal';

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

const WholesalePipeline = () => {
  const [leads, setLeads] = useState<WholesaleLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<WholesaleLead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadFormData>(emptyLeadForm);
  const [deletingLead, setDeletingLead] = useState<WholesaleLead | null>(null);
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
    setForm(emptyLeadForm);
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
      credit_limit: String(lead.credit_limit || ''),
      credit_status: lead.credit_status || 'sin_credito',
      credit_terms: lead.credit_terms || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      estimated_value: Number(form.estimated_value) || 0,
      stage: form.stage,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
      credit_limit: Number(form.credit_limit) || 0,
      credit_status: form.credit_status,
      credit_terms: form.credit_terms || null,
    };

    const { error } = editingLead
      ? await supabase.from('wholesale_leads').update(payload).eq('id', editingLead.id)
      : await supabase.from('wholesale_leads').insert(payload);

    if (error) {
      toast({ title: 'Error', description: editingLead ? 'No se pudo actualizar.' : 'No se pudo crear el lead.', variant: 'destructive' });
      setSaving(false);
      return false;
    }

    toast({ title: editingLead ? 'Lead actualizado' : 'Lead creado', description: `${form.company_name} ${editingLead ? 'actualizado' : 'agregado al pipeline'}.` });
    fetchLeads();
    setSaving(false);
    return true;
  };

  const moveLead = async (lead: WholesaleLead, newStage: string) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));
    const { error } = await supabase.from('wholesale_leads').update({ stage: newStage }).eq('id', lead.id);
    if (error) fetchLeads();
  };

  const onDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    if (!lead || lead.stage === newStage) return;
    moveLead(lead, newStage);
  }, [leads]);

  const handleDelete = async () => {
    if (!deletingLead) return;
    const { error } = await supabase.from('wholesale_leads').delete().eq('id', deletingLead.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el lead.', variant: 'destructive' });
    } else {
      toast({ title: 'Lead eliminado', description: `${deletingLead.company_name} fue eliminado del pipeline.` });
      setLeads(prev => prev.filter(l => l.id !== deletingLead.id));
    }
    setDeletingLead(null);
  };

  const leadsByStage = (stage: string) => leads.filter(l => l.stage === stage);

  const bottleneck = (() => {
    const counts = STAGES.map(s => ({ key: s.key, count: leadsByStage(s.key).length }));
    return counts.reduce((a, b) => b.count > a.count ? b : a, { key: '', count: 0 }).key;
  })();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pipeline de Mayoreo</h2>
          <p className="text-muted-foreground text-sm">Leads de negocios de mayoreo — 7 etapas del embudo.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo Lead
        </Button>
      </div>

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
                    className={`flex-1 rounded-lg border-2 px-3 py-2 text-center transition-all ${isBn ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}
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

      <DragDropContext onDragEnd={onDragEnd}>
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
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[120px] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card className={`border-border bg-card hover:border-primary/30 transition-colors ${snapshot.isDragging ? 'shadow-lg shadow-primary/20 border-primary/40 rotate-1' : ''}`}>
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
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeletingLead(lead)}>
                                        <Trash2 className="h-3 w-3" />
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
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <LeadFormModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) { setEditingLead(null); setForm(emptyLeadForm); } }}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
        isEditing={!!editingLead}
      />

      <AlertDialog open={!!deletingLead} onOpenChange={(open) => { if (!open) setDeletingLead(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <span className="font-semibold">{deletingLead?.company_name}</span> del pipeline. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WholesalePipeline;

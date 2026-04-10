import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';

const STAGES = [
  { key: 'prospecto', label: 'Prospecto' },
  { key: 'contacto_inicial', label: 'Contacto Inicial' },
  { key: 'cotizacion', label: 'Cotización' },
  { key: 'negociacion', label: 'Negociación' },
  { key: 'aprobacion_credito', label: 'Aprobación Crédito' },
  { key: 'orden_confirmada', label: 'Orden Confirmada' },
  { key: 'entrega_cierre', label: 'Entrega/Cierre' },
];

const CREDIT_STATUSES = [
  { key: 'sin_credito', label: 'Sin Crédito' },
  { key: 'en_revision', label: 'En Revisión' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'rechazado', label: 'Rechazado' },
];

const STAFF = ['Ana López', 'Carlos Ruiz', 'María García', 'Jorge Mendoza'];

export interface LeadFormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  estimated_value: string;
  stage: string;
  assigned_to: string;
  notes: string;
  credit_limit: string;
  credit_status: string;
  credit_terms: string;
}

export const emptyLeadForm: LeadFormData = {
  company_name: '', contact_name: '', email: '', phone: '',
  estimated_value: '', stage: 'prospecto', assigned_to: '', notes: '',
  credit_limit: '', credit_status: 'sin_credito', credit_terms: '',
};

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LeadFormData;
  setForm: (form: LeadFormData) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  isEditing: boolean;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;

const LeadFormModal = ({ open, onOpenChange, form, setForm, onSave, saving, isEditing }: LeadFormModalProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setShowSuccess(false);
    }
  }, [open]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.company_name.trim()) e.company_name = 'Requerido';
    if (form.company_name.trim().length > 0 && form.company_name.trim().length < 2) e.company_name = 'Mínimo 2 caracteres';
    if (!form.contact_name.trim()) e.contact_name = 'Requerido';
    if (form.contact_name.trim().length > 0 && form.contact_name.trim().length < 2) e.contact_name = 'Mínimo 2 caracteres';
    if (form.email && !emailRegex.test(form.email)) e.email = 'Email inválido';
    if (form.phone && !phoneRegex.test(form.phone)) e.phone = 'Teléfono inválido';
    if (form.estimated_value && (isNaN(Number(form.estimated_value)) || Number(form.estimated_value) < 0)) e.estimated_value = 'Valor inválido';
    if (form.credit_limit && (isNaN(Number(form.credit_limit)) || Number(form.credit_limit) < 0)) e.credit_limit = 'Límite inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const success = await onSave();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 1500);
    }
  };

  const FieldError = ({ field }: { field: string }) => 
    errors[field] ? (
      <p className="text-[10px] text-destructive flex items-center gap-0.5 mt-0.5">
        <AlertCircle className="h-3 w-3" /> {errors[field]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              >
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </motion.div>
              <p className="text-lg font-semibold text-foreground">
                {isEditing ? '¡Lead actualizado!' : '¡Lead creado exitosamente!'}
              </p>
              <p className="text-sm text-muted-foreground">{form.company_name}</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Lead' : 'Nuevo Lead de Mayoreo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                {/* Company & Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Empresa *</Label>
                    <Input placeholder="Nombre de empresa" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className={`mt-1 ${errors.company_name ? 'border-destructive' : ''}`} maxLength={100} />
                    <FieldError field="company_name" />
                  </div>
                  <div>
                    <Label className="text-xs">Contacto *</Label>
                    <Input placeholder="Nombre contacto" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className={`mt-1 ${errors.contact_name ? 'border-destructive' : ''}`} maxLength={100} />
                    <FieldError field="contact_name" />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" placeholder="email@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={`mt-1 ${errors.email ? 'border-destructive' : ''}`} maxLength={255} />
                    <FieldError field="email" />
                  </div>
                  <div>
                    <Label className="text-xs">Teléfono</Label>
                    <Input placeholder="+52..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={`mt-1 ${errors.phone ? 'border-destructive' : ''}`} maxLength={20} />
                    <FieldError field="phone" />
                  </div>
                </div>

                {/* Value & Stage */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valor Estimado ($)</Label>
                    <Input type="number" min="0" placeholder="0" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} className={`mt-1 ${errors.estimated_value ? 'border-destructive' : ''}`} />
                    <FieldError field="estimated_value" />
                  </div>
                  <div>
                    <Label className="text-xs">Etapa</Label>
                    <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Credit section */}
                <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información de Crédito</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Límite ($)</Label>
                      <Input type="number" min="0" placeholder="0" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} className={`mt-1 ${errors.credit_limit ? 'border-destructive' : ''}`} />
                      <FieldError field="credit_limit" />
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <Select value={form.credit_status} onValueChange={v => setForm({ ...form, credit_status: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{CREDIT_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Términos</Label>
                      <Input placeholder="Net 30..." value={form.credit_terms} onChange={e => setForm({ ...form, credit_terms: e.target.value })} className="mt-1" maxLength={50} />
                    </div>
                  </div>
                </div>

                {/* Assigned & Notes */}
                <div>
                  <Label className="text-xs">Asignar a</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{STAFF.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notas</Label>
                  <Textarea placeholder="Detalles del lead..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} maxLength={500} />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.notes.length}/500</p>
                </div>

                <Button className="w-full gap-2" onClick={handleSubmit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Lead'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormModal;

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  helper?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const CATEGORIES = [
  { v: 'envios', l: 'Envíos' },
  { v: 'marketing', l: 'Marketing' },
  { v: 'facturacion', l: 'Facturación' },
  { v: 'soporte', l: 'Servicio al Cliente' },
  { v: 'pagos', l: 'Pagos' },
  { v: 'other', l: 'Otros' },
];

type ValidationKind = 'none' | 'regex' | 'http';

const AddCustomAppDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [category, setCategory] = useState('other');
  const [fields, setFields] = useState<Field[]>([
    { key: 'api_key', label: 'API Key', type: 'password', required: true },
  ]);

  const [valKind, setValKind] = useState<ValidationKind>('none');
  // regex
  const [regField, setRegField] = useState('');
  const [regPattern, setRegPattern] = useState('');
  const [regMessage, setRegMessage] = useState('');
  // http
  const [httpUrl, setHttpUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('GET');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'token' | 'basic' | 'header'>('none');
  const [authField, setAuthField] = useState('');
  const [authUserField, setAuthUserField] = useState('');
  const [authPassField, setAuthPassField] = useState('');
  const [authHeaderName, setAuthHeaderName] = useState('');
  const [authPrefix, setAuthPrefix] = useState('');

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const updateField = (i: number, patch: Partial<Field>) =>
    setFields((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () =>
    setFields((arr) => [...arr, { key: `field_${arr.length + 1}`, label: '', type: 'text', required: true }]);
  const removeField = (i: number) => setFields((arr) => arr.filter((_, idx) => idx !== i));

  const buildValidation = () => {
    if (valKind === 'none') return { kind: 'none' };
    if (valKind === 'regex')
      return { kind: 'regex', field: regField, pattern: regPattern, message: regMessage || undefined };
    const auth: Record<string, unknown> | undefined =
      authType === 'none'
        ? undefined
        : authType === 'bearer'
          ? { type: 'bearer', field: authField }
          : authType === 'token'
            ? { type: 'token', field: authField, prefix: authPrefix || 'Token token=' }
            : authType === 'basic'
              ? { type: 'basic', user_field: authUserField, password_field: authPassField }
              : { type: 'header', header_name: authHeaderName, field: authField, prefix: authPrefix || undefined };
    return { kind: 'http', method: httpMethod, url: httpUrl, auth };
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y slug son obligatorios.', variant: 'destructive' });
      return;
    }
    if (!fields.length || fields.some((f) => !f.key || !f.label)) {
      toast({ title: 'Schema inválido', description: 'Cada campo necesita key y label.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('integrations').insert({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      api_docs_url: docsUrl.trim() || null,
      category,
      credential_schema: fields as any,
      validation: buildValidation() as any,
      is_custom: true,
      is_installed: false,
      is_active: false,
      config: {} as any,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '✓ App añadida', description: `${name} está disponible en el catálogo.` });
    onCreated?.();
    onOpenChange(false);
    // reset
    setName(''); setSlug(''); setDescription(''); setDocsUrl(''); setCategory('other');
    setFields([{ key: 'api_key', label: 'API Key', type: 'password', required: true }]);
    setValKind('none');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Añadir App al catálogo</DialogTitle>
          <DialogDescription className="text-xs">
            Define una nueva integración con su esquema de credenciales y reglas de validación. No requiere tocar código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="Ej: Mailchimp" />
            </div>
            <div>
              <Label className="text-xs">Slug * (único)</Label>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="mailchimp" className="font-mono text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">URL de docs (opcional)</Label>
              <Input value={docsUrl} onChange={(e) => setDocsUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Esquema de credenciales</h4>
              <Button size="sm" variant="outline" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button>
            </div>
            {fields.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded bg-muted/30">
                <div className="col-span-3">
                  <Label className="text-[10px]">Key</Label>
                  <Input value={f.key} onChange={(e) => updateField(i, { key: slugify(e.target.value) })} className="h-8 text-xs font-mono" />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Label</Label>
                  <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Tipo</Label>
                  <Select value={f.type} onValueChange={(v) => updateField(i, { type: v as 'text' | 'password' })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="password">Contraseña</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Placeholder</Label>
                  <Input value={f.placeholder || ''} onChange={(e) => updateField(i, { placeholder: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="col-span-1 flex items-center gap-1">
                  <Switch checked={f.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeField(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium">Validación al conectar</h4>
            <Select value={valKind} onValueChange={(v) => setValKind(v as ValidationKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna (solo verifica que los campos no estén vacíos)</SelectItem>
                <SelectItem value="regex">Regex sobre un campo</SelectItem>
                <SelectItem value="http">Llamada HTTP de prueba</SelectItem>
              </SelectContent>
            </Select>

            {valKind === 'regex' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Campo</Label>
                  <Input value={regField} onChange={(e) => setRegField(e.target.value)} placeholder="api_key" className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-[10px]">Patrón</Label>
                  <Input value={regPattern} onChange={(e) => setRegPattern(e.target.value)} placeholder="^sk_[a-z0-9]+$" className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-[10px]">Mensaje error</Label>
                  <Input value={regMessage} onChange={(e) => setRegMessage(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            )}

            {valKind === 'http' && (
              <div className="space-y-2 p-3 rounded bg-muted/30">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px]">Método</Label>
                    <Select value={httpMethod} onValueChange={(v) => setHttpMethod(v as 'GET' | 'POST')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px]">URL (usa {'{field_key}'} para interpolar)</Label>
                    <Input value={httpUrl} onChange={(e) => setHttpUrl(e.target.value)} placeholder="https://api.x.com/v1/me" className="h-8 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px]">Auth</Label>
                    <Select value={authType} onValueChange={(v) => setAuthType(v as typeof authType)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguna</SelectItem>
                        <SelectItem value="bearer">Bearer</SelectItem>
                        <SelectItem value="token">Token (Skydropx-style)</SelectItem>
                        <SelectItem value="basic">Basic (user:pass)</SelectItem>
                        <SelectItem value="header">Header custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(authType === 'bearer' || authType === 'token' || authType === 'header') && (
                    <div>
                      <Label className="text-[10px]">Field</Label>
                      <Input value={authField} onChange={(e) => setAuthField(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                  )}
                  {authType === 'basic' && (
                    <>
                      <div><Label className="text-[10px]">User field</Label><Input value={authUserField} onChange={(e) => setAuthUserField(e.target.value)} className="h-8 text-xs font-mono" /></div>
                      <div><Label className="text-[10px]">Pass field</Label><Input value={authPassField} onChange={(e) => setAuthPassField(e.target.value)} className="h-8 text-xs font-mono" /></div>
                    </>
                  )}
                  {authType === 'header' && (
                    <div><Label className="text-[10px]">Header name</Label><Input value={authHeaderName} onChange={(e) => setAuthHeaderName(e.target.value)} className="h-8 text-xs" /></div>
                  )}
                  {(authType === 'token' || authType === 'header') && (
                    <div><Label className="text-[10px]">Prefijo</Label><Input value={authPrefix} onChange={(e) => setAuthPrefix(e.target.value)} className="h-8 text-xs font-mono" /></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar app
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomAppDialog;

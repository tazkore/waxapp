import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  variables: string[];
}

const SettingsEmails = () => {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('email_templates').select('*').order('name');
    const list = ((data as any[]) || []).map((t) => ({ ...t, variables: Array.isArray(t.variables) ? t.variables : [] })) as Template[];
    setItems(list);
    if (list.length && !activeId) setActiveId(list[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateLocal = (id: string, patch: Partial<Template>) =>
    setItems((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const save = async (t: Template) => {
    setSavingId(t.id);
    const { error } = await supabase.from('email_templates').update({
      subject: t.subject, body_html: t.body_html, is_active: t.is_active,
    }).eq('id', t.id);
    setSavingId(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado', description: `${t.name} actualizada.` });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const active = items.find((t) => t.id === activeId);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground">E-mails automáticos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <div className="space-y-1">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 transition ${
                  activeId === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{t.name}</span>
                <Badge variant="outline" className={t.is_active ? 'border-primary/30 text-primary text-[10px]' : 'border-border text-[10px]'}>
                  {t.is_active ? 'On' : 'Off'}
                </Badge>
              </button>
            ))}
          </div>

          {active && (
            <div className="space-y-4 min-w-0">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">{active.name} <span className="text-xs text-muted-foreground">({active.slug})</span></Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Activa</Label>
                  <Switch checked={active.is_active} onCheckedChange={(v) => updateLocal(active.id, { is_active: v })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Asunto</Label>
                <Input value={active.subject} onChange={(e) => updateLocal(active.id, { subject: e.target.value })} className="bg-muted border-border" />
              </div>
              <div className="space-y-2">
                <Label>Cuerpo HTML</Label>
                <Textarea value={active.body_html} onChange={(e) => updateLocal(active.id, { body_html: e.target.value })} rows={10} className="bg-muted border-border font-mono text-xs" />
              </div>
              {active.variables.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Variables disponibles:{' '}
                  {active.variables.map((v) => (
                    <code key={v} className="px-1.5 py-0.5 mr-1 bg-muted rounded text-foreground">{`{{${v.replace(/[{}]/g,'')}}}`}</code>
                  ))}
                </div>
              )}
              <Button onClick={() => save(active)} disabled={savingId === active.id} className="gap-2">
                {savingId === active.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar plantilla
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsEmails;

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Users, Megaphone, ExternalLink, RefreshCw, Send, Loader2, CheckCircle2, XCircle, Phone, Calendar, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  getWhatsAppLeads,
  getAllClientPhones,
  getWhatsAppClientPhones,
  getAbandonedCartPhones,
  sendWhatsAppBroadcast,
  type WhatsAppLead,
} from '@/lib/kapsoService';

const PAGE_SIZE = 20;

const AUDIENCE_OPTIONS = [
  { value: 'whatsapp', label: 'Solo clientes de WhatsApp', description: 'Leads capturados por WhatsApp' },
  { value: 'all', label: 'Todos los clientes', description: 'Con número de teléfono registrado' },
  { value: 'abandoned', label: 'Carritos abandonados', description: 'Clientes con carrito sin recuperar' },
] as const;

type AudienceKey = typeof AUDIENCE_OPTIONS[number]['value'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Tab: CRM Leads ──────────────────────────────────────────────────────────

function CRMLeadsTab() {
  const [leads, setLeads] = useState<WhatsAppLead[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count: total } = await getWhatsAppLeads(page, PAGE_SIZE);
      setLeads(data);
      setCount(total);
    } catch {
      // silencio — tabla puede no tener la columna aún
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10">
            {count} leads
          </Badge>
          <span className="text-xs text-muted-foreground">capturados vía WhatsApp</span>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5 text-muted-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Nombre</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />Teléfono</div>
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />Entrada</div>
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {[...Array(4)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!loading && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="h-7 w-7 text-green-500/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sin leads de WhatsApp aún</p>
                      <p className="text-xs mt-0.5">Los contactos aparecerán aquí al escribirte por WhatsApp</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && leads.map((lead) => (
              <TableRow key={lead.id} className="group hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{lead.phone ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(lead.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-1.5 opacity-50 cursor-not-allowed text-xs"
                    title="Próximamente: abrir conversación en Kapso"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver chat
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Campañas ───────────────────────────────────────────────────────────

function CampaignsTab() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<AudienceKey>('whatsapp');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const audienceInfo = AUDIENCE_OPTIONS.find((o) => o.value === audience)!;
  const charCount = message.length;
  const charLimit = 1000;

  const handleLaunch = async () => {
    if (!message.trim()) {
      toast({ title: 'Escribe un mensaje antes de lanzar la campaña', variant: 'destructive' });
      return;
    }
    if (charCount > charLimit) {
      toast({ title: `El mensaje excede ${charLimit} caracteres`, variant: 'destructive' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      let phones: string[] = [];

      if (audience === 'all') {
        phones = await getAllClientPhones();
      } else if (audience === 'whatsapp') {
        phones = await getWhatsAppClientPhones();
      } else if (audience === 'abandoned') {
        phones = await getAbandonedCartPhones();
      }

      if (!phones.length) {
        toast({ title: 'No hay teléfonos para el segmento seleccionado', variant: 'destructive' });
        return;
      }

      const res = await sendWhatsAppBroadcast(phones, message);
      setResult({ sent: res.sent, failed: res.failed, errors: res.errors });

      toast({
        title: `Campaña enviada: ${res.sent} mensajes`,
        description: res.failed > 0 ? `${res.failed} fallaron` : 'Sin errores',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast({ title: 'Error al enviar campaña', description: msg, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Mensaje */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mensaje de la campaña</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ej: ¡15% de descuento en todos los Vapes! Usa el código WAXAPP15 al pagar. Válido hoy. 🔥"
          className="min-h-[120px] resize-none font-mono text-sm"
          disabled={sending}
        />
        <div className={`text-xs text-right ${charCount > charLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {charCount}/{charLimit}
        </div>
      </div>

      {/* Audiencia */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Enviar a</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as AudienceKey)} disabled={sending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
          Solo se enviará a contactos que ya hayan iniciado conversación contigo (política de WhatsApp Business)
        </p>
      </div>

      {/* Botón launch */}
      <Button
        onClick={handleLaunch}
        disabled={sending || !message.trim()}
        className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold h-11"
      >
        {sending ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Enviando campaña…</>
        ) : (
          <><Send className="h-4 w-4" />Lanzar Campaña por WhatsApp</>
        )}
      </Button>

      {/* Resultado */}
      {result && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">Resultado de la campaña</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-green-400">{result.sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Fallidos</p>
              </div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Ver errores ({result.errors.length})</summary>
              <ul className="mt-2 space-y-1 pl-3 border-l border-border">
                {result.errors.slice(0, 10).map((err, i) => (
                  <li key={i} className="text-destructive/80">{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const WhatsAppCRMSection = () => {
  const webhookUrl = `https://nytjvcykmimblubegxjq.supabase.co/functions/v1/kapso-webhook`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">WhatsApp CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by <span className="text-green-400 font-medium">Kapso.ai</span> — Captura leads y lanza campañas masivas
          </p>
        </div>
      </div>

      {/* Webhook info */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageCircle className="h-3.5 w-3.5 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">URL del Webhook (Kapso → Supabase)</p>
              <code className="text-xs font-mono text-foreground/80 break-all bg-black/20 rounded px-2 py-1 block">
                {webhookUrl}
              </code>
              <p className="text-xs text-muted-foreground mt-1.5">
                Pega esta URL en el panel de Kapso.ai → Settings → Webhooks → URL del evento <code>message.received</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="leads">
        <TabsList className="mb-4">
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            CRM Leads
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Campañas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads capturados por WhatsApp</CardTitle>
              <CardDescription>Contactos que te escribieron por WhatsApp y fueron registrados automáticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <CRMLeadsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lanzar campaña masiva</CardTitle>
              <CardDescription>Envía mensajes de WhatsApp a segmentos de clientes usando la API de Kapso</CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppCRMSection;

import { useEffect, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Plus, Trash2, Loader2, Tag, Percent, DollarSign, CheckCircle2,
  XCircle, TrendingUp, Search, Copy, Send, MessageCircle, Mail,
  ExternalLink, Sparkles, Share2, Instagram, Youtube, Bot, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Discount {
  id: string; code: string; type: string; value: number;
  min_purchase: number; max_uses: number | null; used_count: number;
  is_active: boolean; expires_at: string | null; created_at: string;
}

// ─── Campaign channels ───────────────────────────────────────────────
interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  placeholder: string;
  buildLink: (msg: string, extra?: string) => string;
  note?: string;
}

const channels: Channel[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: <MessageCircle className="h-5 w-5" />,
    color: 'text-green-500',
    description: 'Envía tu mensaje directamente a un número o comparte el link de difusión.',
    placeholder: '🔥 ¡Oferta especial WAXAPP! Visita nuestra tienda y usa el código PROMO15 para 15% off en todo. 🛒',
    buildLink: (msg, phone) =>
      `https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
    note: 'Para difusión masiva, usa el link sin número y compártelo en tus grupos.',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <Send className="h-5 w-5" />,
    color: 'text-blue-400',
    description: 'Comparte en tu canal o grupo de Telegram.',
    placeholder: '🌿 Nueva llegada en WAXAPP: CBD nano-emulsionado de alta biodisponibilidad. Link directo 👇',
    buildLink: (msg) => `https://t.me/share/url?url=${encodeURIComponent('https://waxapp.mx')}&text=${encodeURIComponent(msg)}`,
  },
  {
    id: 'email',
    name: 'Email / Mailto',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-orange-400',
    description: 'Abre tu cliente de correo con el mensaje pre-llenado.',
    placeholder: 'Hola, te escribimos desde WAXAPP con una oferta exclusiva para ti...',
    buildLink: (msg, subject) =>
      `mailto:?subject=${encodeURIComponent(subject || 'Oferta WAXAPP')}&body=${encodeURIComponent(msg)}`,
    note: 'Exporta tu lista de clientes desde la sección Clientes y pégalos en el campo Para:',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="h-5 w-5" />,
    color: 'text-pink-500',
    description: 'Genera el texto para tu post o Story. Copia y pega en la app.',
    placeholder: '✨ WAXAPP — Bienestar Bio-Tech de alta gama\n\n🌿 CBD • Nano • Vapes Premium\n\n🔗 Link en bio\n\n#WAXAPP #CBD #Vapes #MexicoWellness #BioTech',
    buildLink: () => `https://www.instagram.com/`,
    note: 'Instagram no permite links directos. Copia el texto y publícalo desde la app.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Share2 className="h-5 w-5" />,
    color: 'text-blue-600',
    description: 'Comparte en tu página o perfil de Facebook.',
    placeholder: '🛒 ¡Visita WAXAPP y descubre nuestros productos premium de bienestar! Envío a toda la república mexicana.',
    buildLink: (msg) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://waxapp.mx')}&quote=${encodeURIComponent(msg)}`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <Youtube className="h-5 w-5" />,
    color: 'text-foreground',
    description: 'Genera el caption para tu video. Copia y pega al subir.',
    placeholder: '¿Conoces el CBD nano-emulsionado? 🌿 Biodisponibilidad hasta 5x mayor. Solo en WAXAPP 🔗\n\n#CBD #Bienestar #NanoTech #WAXAPP #FYP',
    buildLink: () => `https://www.tiktok.com/upload`,
    note: 'TikTok no permite compartir externamente. Copia el caption y pégalo al subir tu video.',
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: <MessageCircle className="h-5 w-5" />,
    color: 'text-yellow-400',
    description: 'Envía un SMS promocional a un número.',
    placeholder: 'WAXAPP: Oferta especial. Usa código PROMO15 por 15% off. Visita waxapp.mx. Cancela: STOP',
    buildLink: (msg, phone) =>
      `sms:${phone || ''}?body=${encodeURIComponent(msg)}`,
    note: 'Para envíos masivos de SMS considera servicios como SMSMASIVO.com o Twilio.',
  },
];

// ─── Campaign Builder ────────────────────────────────────────────────
const CampaignBuilder = () => {
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0]);
  const [message, setMessage] = useState('');
  const [extra, setExtra] = useState(''); // phone / subject
  const [generated, setGenerated] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const generatedLink = activeChannel.buildLink(message, extra);

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    toast({ title: 'Copiado', description: 'Mensaje copiado al portapapeles.' });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Link copiado', description: 'Link listo para compartir.' });
  };

  const generateWithAI = async () => {
    if (!activeChannel) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          message: `Genera un mensaje de marketing corto y efectivo para ${activeChannel.name} de una tienda de productos de bienestar premium llamada WAXAPP (CBD, nano, vapes). Máximo 280 caracteres. Sin hashtags si es email o SMS. Incluye emoji si es WhatsApp, Instagram o TikTok. Responde SOLO con el texto del mensaje, nada más.`,
          session_id: 'marketing-ai',
        },
      });
      if (error) throw error;
      const text = data?.reply || data?.message || '';
      if (text) setMessage(text);
      else toast({ title: 'Sin respuesta de IA', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Error IA', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Channel selector */}
      <div>
        <Label className="text-xs mb-2 block text-muted-foreground uppercase tracking-wider">Canal</Label>
        <div className="flex flex-wrap gap-2">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => { setActiveChannel(ch); setMessage(''); setExtra(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeChannel.id === ch.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              <span className={ch.color}>{ch.icon}</span>
              {ch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active channel info */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <span className={`${activeChannel.color} mt-0.5 shrink-0`}>{activeChannel.icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{activeChannel.name}</p>
            <p className="text-xs text-muted-foreground">{activeChannel.description}</p>
            {activeChannel.note && (
              <p className="text-[11px] text-amber-400 mt-1">⚠ {activeChannel.note}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extra field (phone/subject) */}
      {(activeChannel.id === 'whatsapp' || activeChannel.id === 'sms') && (
        <div>
          <Label className="text-xs mb-1 block">
            Número {activeChannel.id === 'whatsapp' ? 'WhatsApp' : 'celular'} (con código de país, ej: 52155...)
          </Label>
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="521554321234"
            className="font-mono"
          />
        </div>
      )}
      {activeChannel.id === 'email' && (
        <div>
          <Label className="text-xs mb-1 block">Asunto del email</Label>
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Oferta exclusiva WAXAPP — Esta semana"
          />
        </div>
      )}

      {/* Message editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs">Mensaje / Caption</Label>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono ${message.length > 260 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {message.length} chars
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={generateWithAI}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generar con IA
            </Button>
          </div>
        </div>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={activeChannel.placeholder}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={copyMessage}
          disabled={!message}
        >
          <Copy className="h-4 w-4" /> Copiar mensaje
        </Button>
        <Button
          className="gap-2"
          onClick={copyLink}
          disabled={!message && activeChannel.id !== 'instagram' && activeChannel.id !== 'tiktok'}
        >
          <Copy className="h-4 w-4" /> Copiar link
        </Button>
        <a
          href={generatedLink}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border bg-card hover:bg-muted transition-colors ${!message && activeChannel.id !== 'instagram' && activeChannel.id !== 'tiktok' ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ExternalLink className="h-4 w-4" /> Abrir {activeChannel.name}
        </a>
      </div>

      {/* Link preview */}
      {message && (
        <div className="p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Link generado:</p>
          <p className="text-xs font-mono text-foreground break-all">{generatedLink}</p>
        </div>
      )}
    </div>
  );
};

// ─── AI Marketing Assistant ──────────────────────────────────────────
interface AICopy {
  facebook: string;
  google: string;
  email_subject: string;
  email_body: string;
}

const AIMarketingAssistant = () => {
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [tone, setTone] = useState<'urgente' | 'informativo' | 'emocional'>('urgente');
  const [result, setResult] = useState<AICopy | null>(null);
  const [loading, setLoading] = useState(false);
  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    supabase
      .from('products')
      .select('id,name,price')
      .eq('is_active', true)
      .order('name')
      .limit(50)
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  const generate = async () => {
    if (!selectedProduct || !hasGeminiKey) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    setLoading(true);
    setResult(null);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Eres un experto en marketing digital de cannabis y vapes en México. Crea copy publicitario ${tone} para el producto "${product.name}" a $${product.price} MXN. Devuelve SOLO JSON válido:
{
  "facebook": "Copy para Facebook Ads (máx 125 caracteres, con emoji al inicio)",
  "google": "Titular para Google Ads (máx 30 caracteres) | Descripción (máx 90 caracteres)",
  "email_subject": "Asunto de email (máx 50 caracteres, con emoji)",
  "email_body": "Cuerpo del email (2-3 párrafos cortos, persuasivos, en español mexicano)"
}`;
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      setResult(JSON.parse(text));
    } catch (e: any) {
      toast({ title: 'Error IA', description: e?.message ?? 'Error generando copy', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '✅ Copiado al portapapeles' });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Asistente de Marketing con IA (Gemini)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecciona un producto activo y genera copy listo para Facebook Ads, Google Ads y Email en segundos.
          </p>
        </div>
      </div>

      {!hasGeminiKey && (
        <div className="px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400">
          ⚠ Añade <code className="font-mono">VITE_GEMINI_API_KEY</code> en tu <code>.env</code> para activar el asistente IA.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground uppercase mb-1.5 block">Producto activo</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar producto…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase mb-1.5 block">Tono del mensaje</label>
          <Select value={tone} onValueChange={(v: any) => setTone(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgente">🔥 Urgente / Oferta</SelectItem>
              <SelectItem value="informativo">📚 Informativo</SelectItem>
              <SelectItem value="emocional">💚 Emocional / Bienestar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={generate}
        disabled={!selectedProduct || !hasGeminiKey || loading}
        className="gap-2"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando copy…</>
          : <><Sparkles className="h-4 w-4" /> Generar Copy con IA</>}
      </Button>

      {result && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: '📘 Facebook Ads', icon: Share2, content: result.facebook },
            { label: '🔍 Google Ads', icon: Search, content: result.google },
            { label: '📧 Asunto Email', icon: Mail, content: result.email_subject },
            { label: '📧 Cuerpo Email', icon: Mail, content: result.email_body },
          ].map(({ label, icon: Icon, content }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(content)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && (
        <Button variant="outline" size="sm" onClick={generate} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Regenerar
        </Button>
      )}
    </div>
  );
};

// ─── Main Marketing Section ──────────────────────────────────────────
const MarketingSection = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' });

  const load = async () => {
    const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setDiscounts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (d: Discount) => {
    await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
    load();
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.value) {
      toast({ title: 'Código y valor son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    const { error } = await supabase.from('discounts').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Cupón creado' });
      setOpen(false);
      setForm({ code: '', type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' });
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setDiscounts(p => p.filter(d => d.id !== id)); toast({ title: 'Cupón eliminado' }); }
  };

  const filtered = discounts.filter(d => {
    if (search && !d.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive === 'active' && !d.is_active) return false;
    if (filterActive === 'inactive' && d.is_active) return false;
    return true;
  });

  const totalUses = discounts.reduce((s, d) => s + d.used_count, 0);
  const activeCount = discounts.filter(d => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" /> Marketing Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cupones de descuento y campañas en redes sociales.</p>
      </div>

      <Tabs defaultValue="cupones">
        <TabsList className="mb-2">
          <TabsTrigger value="cupones" className="gap-1.5">
            <Tag className="h-4 w-4" /> Cupones
          </TabsTrigger>
          <TabsTrigger value="campanas" className="gap-1.5">
            <Send className="h-4 w-4" /> Campañas Gratis
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Asistente IA
          </TabsTrigger>
        </TabsList>

        {/* ── Coupons Tab ── */}
        <TabsContent value="cupones" className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gestiona descuentos y códigos promocionales.</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Cupón
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total cupones', value: discounts.length, icon: Tag, color: 'text-foreground' },
              { label: 'Activos', value: activeCount, icon: CheckCircle2, color: 'text-primary' },
              { label: 'Inactivos', value: discounts.length - activeCount, icon: XCircle, color: 'text-muted-foreground' },
              { label: 'Usos totales', value: totalUses, icon: TrendingUp, color: 'text-primary' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <s.icon className={`h-7 w-7 ${s.color} opacity-80 shrink-0`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
            </div>
            <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterActive(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl py-16 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{search ? 'Sin resultados.' : 'Sin cupones creados.'}</p>
              {!search && <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="mt-4 gap-2"><Plus className="h-3.5 w-3.5" /> Crear cupón</Button>}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descuento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vence</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((d, i) => {
                        const usePct = d.max_uses ? Math.min((d.used_count / d.max_uses) * 100, 100) : null;
                        return (
                          <motion.tr
                            key={d.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded text-xs tracking-widest">{d.code}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {d.type === 'percentage'
                                  ? <><Percent className="h-3.5 w-3.5 text-primary" /><span className="text-foreground font-medium">{d.value}%</span></>
                                  : <><DollarSign className="h-3.5 w-3.5 text-primary" /><span className="text-foreground font-medium">${d.value} MXN</span></>}
                              </div>
                            </td>
                            <td className="px-4 py-3 min-w-[120px]">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  {d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ''} usos
                                </p>
                                {usePct !== null && (
                                  <div className="h-1 bg-muted rounded-full overflow-hidden w-24">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${usePct}%` }} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {d.expires_at ? new Date(d.expires_at).toLocaleDateString('es-MX') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleActive(d)}>
                                <Badge className={`text-[10px] cursor-pointer ${d.is_active ? 'bg-primary/15 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                  {d.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="campanas" className="space-y-5">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Campañas 100% gratuitas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Genera mensajes con IA y compártelos en WhatsApp, Instagram, Facebook, TikTok, Telegram, Email o SMS sin costo alguno.
                No requieren API keys ni cuentas de pago.
              </p>
            </div>
          </div>
          <CampaignBuilder />
        </TabsContent>

        {/* ── AI Marketing Assistant Tab ── */}
        <TabsContent value="ia">
          <AIMarketingAssistant />
        </TabsContent>
      </Tabs>

      {/* New Coupon Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> Nuevo Cupón de Descuento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Código *</Label>
                <Input className="bg-muted border-border font-mono uppercase" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BIENVENIDA15" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Valor *</Label>
                <Input type="number" className="bg-muted border-border" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '15' : '100'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Compra mínima ($)</Label>
                <Input type="number" className="bg-muted border-border" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Máx. usos</Label>
                <Input type="number" className="bg-muted border-border" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Sin límite" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Vence el</Label>
                <Input type="date" className="bg-muted border-border" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Crear cupón
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingSection;

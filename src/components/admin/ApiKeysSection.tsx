import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Key, Eye, EyeOff, Copy, ShieldAlert, Lock, Loader2, History, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  name: string;
  is_public: boolean;
  is_configured: boolean;
  value: string | null;
}

interface AccessLog {
  id: string;
  user_email: string | null;
  secret_name: string;
  ip_address: string | null;
  created_at: string;
}

const SECRET_DESCRIPTIONS: Record<string, string> = {
  SUPABASE_URL: 'URL pública del backend. Segura para frontend.',
  SUPABASE_ANON_KEY: 'Clave pública (con RLS). Segura para frontend.',
  SUPABASE_PUBLISHABLE_KEY: 'Alias de la anon key (formato nuevo).',
  SUPABASE_SERVICE_ROLE_KEY: '⚠️ ACCESO TOTAL — bypassa RLS. Solo en backend.',
  SUPABASE_JWKS: 'Llaves de verificación JWT. Privada.',
  LOVABLE_API_KEY: 'Consume créditos de IA. Privada.',
  RESEND_API_KEY: 'Envío de emails. Privada.',
  CLIP_PUBLIC_KEY: 'Tokenización en checkout. Pública.',
  CLIP_API_KEY: 'Cobros con Clip. Privada.',
  AMAZON_LWA_CLIENT_ID: 'OAuth Amazon SP-API. Privada.',
  AMAZON_LWA_CLIENT_SECRET: 'OAuth Amazon SP-API. Privada.',
  AMAZON_REFRESH_TOKEN: 'Refresh token Amazon. Privada.',
};

const ApiKeysSection = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [revealingAll, setRevealingAll] = useState(false);
  const [logs, setLogs] = useState<AccessLog[]>([]);

  // Verificar rol
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setIsSuperAdmin(false);
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
    })();
  }, []);

  // Cargar inventario (sin valores privados)
  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reveal-api-keys', { body: {} });
      if (error) throw error;
      setInventory(data.inventory ?? []);
    } catch (e) {
      toast.error('Error: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from('api_key_access_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data as any) ?? []);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadInventory();
      loadLogs();
    }
  }, [isSuperAdmin]);

  const revealOne = async (name: string) => {
    if (revealed[name]) {
      setRevealed((r) => { const n = { ...r }; delete n[name]; return n; });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('reveal-api-keys', {
        body: { secret_names: [name] },
      });
      if (error) throw error;
      const val = data.secrets?.[name];
      if (!val) return toast.error('Clave no configurada');
      setRevealed((r) => ({ ...r, [name]: val }));
      loadLogs();
    } catch (e) {
      toast.error('Error: ' + (e as Error).message);
    }
  };

  const revealAll = async () => {
    setRevealingAll(true);
    try {
      const names = inventory.filter((i) => !i.is_public && i.is_configured).map((i) => i.name);
      const { data, error } = await supabase.functions.invoke('reveal-api-keys', {
        body: { secret_names: names },
      });
      if (error) throw error;
      setRevealed(data.secrets ?? {});
      toast.success(`${names.length} claves reveladas — registradas en auditoría`);
      loadLogs();
    } catch (e) {
      toast.error('Error: ' + (e as Error).message);
    } finally {
      setRevealingAll(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada`);
  };

  if (isSuperAdmin === null) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!isSuperAdmin) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle>Acceso restringido</AlertTitle>
        <AlertDescription>
          Esta sección solo está disponible para usuarios con rol <strong>super_admin</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  const publicItems = inventory.filter((i) => i.is_public);
  const privateItems = inventory.filter((i) => !i.is_public);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Zona crítica de seguridad</AlertTitle>
        <AlertDescription className="space-y-1 text-xs">
          <p>Las claves <strong>privadas</strong> dan acceso total a tu backend, IA y pagos. Cada vez que reveles una, queda registrada con tu usuario, IP y fecha.</p>
          <p>Nunca las compartas por chat, captures pantalla con ellas visibles, ni las pegues en el código del frontend.</p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><Key className="h-3 w-3 mr-1" /> API Keys</TabsTrigger>
          <TabsTrigger value="guide">Guía de conexión</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3 w-3 mr-1" /> Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {/* PÚBLICAS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Claves públicas
                <Badge variant="outline" className="text-green-500 border-green-500/30">Seguras</Badge>
              </CardTitle>
              <CardDescription>Pueden ir directamente en el código frontend de otros proyectos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                publicItems.map((item) => (
                  <KeyRow
                    key={item.name}
                    name={item.name}
                    description={SECRET_DESCRIPTIONS[item.name]}
                    value={item.value}
                    isConfigured={item.is_configured}
                    onCopy={copy}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* PRIVADAS */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Claves privadas
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30">Sensibles</Badge>
                </CardTitle>
                <CardDescription>Cada revelación queda registrada en auditoría.</CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={revealingAll || privateItems.length === 0}>
                    {revealingAll ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Eye className="h-3 w-3 mr-2" />}
                    Revelar todas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Revelar todas las claves privadas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción quedará <strong>registrada en auditoría</strong> con tu usuario, IP y fecha.
                      Asegúrate de no estar compartiendo pantalla.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={revealAll}>Sí, revelar todas</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                privateItems.map((item) => (
                  <KeyRow
                    key={item.name}
                    name={item.name}
                    description={SECRET_DESCRIPTIONS[item.name]}
                    value={revealed[item.name] ?? null}
                    isConfigured={item.is_configured}
                    isPrivate
                    onReveal={() => revealOne(item.name)}
                    onCopy={copy}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conectar otro proyecto al mismo Supabase</CardTitle>
              <CardDescription>Comparte datos entre dos sitios sin duplicar el backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. En el otro proyecto</h4>
                <p className="text-muted-foreground mb-2">Configura el cliente Supabase con:</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono whitespace-pre-wrap">
{`Conecta este proyecto al backend Supabase existente con:
URL: ${publicItems.find(i => i.name === 'SUPABASE_URL')?.value ?? '...'}
Anon Key: <pega la anon key de la pestaña anterior>`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Configurar el cliente manualmente</h4>
                <pre className="bg-muted p-3 rounded text-xs font-mono whitespace-pre-wrap">
{`import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  '${publicItems.find(i => i.name === 'SUPABASE_URL')?.value ?? 'SUPABASE_URL'}',
  'TU_ANON_KEY'
);`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. RLS sigue protegiendo los datos</h4>
                <p className="text-muted-foreground">
                  El otro proyecto solo verá lo que las políticas permitan. Si necesitas exponer
                  datos a usuarios no autenticados, agrega políticas para el rol <code>anon</code>.
                </p>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-semibold mb-2 text-destructive">⚠️ Nunca uses SERVICE_ROLE_KEY en frontend</h4>
                <p className="text-muted-foreground">
                  Esa clave bypassa todas las políticas RLS. Solo úsala dentro de Edge Functions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auditoría de acceso a claves privadas</CardTitle>
              <CardDescription>Últimos 50 accesos.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin accesos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="text-xs flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="font-mono">{l.secret_name}</span>
                        <span className="text-muted-foreground"> · {l.user_email ?? 'desconocido'}</span>
                        {l.ip_address && <span className="text-muted-foreground"> · {l.ip_address}</span>}
                      </div>
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('es-MX')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface KeyRowProps {
  name: string;
  description?: string;
  value: string | null;
  isConfigured: boolean;
  isPrivate?: boolean;
  onReveal?: () => void;
  onCopy: (text: string, label: string) => void;
}

const KeyRow = ({ name, description, value, isConfigured, isPrivate, onReveal, onCopy }: KeyRowProps) => (
  <div className="border border-border rounded p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium">{name}</span>
          {!isConfigured && <Badge variant="outline" className="text-xs">No configurada</Badge>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
    {isConfigured && (
      <div className="flex items-center gap-2">
        <Input
          value={value ?? '••••••••••••••••••••••••••••'}
          readOnly
          className="font-mono text-xs h-8"
          type={value ? 'text' : 'password'}
        />
        {isPrivate && (
          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={onReveal} title={value ? 'Ocultar' : 'Revelar'}>
            {value ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        {value && (
          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => onCopy(value, name)} title="Copiar">
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    )}
  </div>
);

export default ApiKeysSection;

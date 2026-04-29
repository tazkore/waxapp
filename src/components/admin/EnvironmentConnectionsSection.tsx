import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Network, Plus, Pencil, Trash2, ShieldAlert, PlugZap, Loader2, Lock, CheckCircle2, XCircle } from "lucide-react";

type EnvConnection = {
  id: string;
  name: string;
  description: string | null;
  environment_type: string;
  project_url: string;
  anon_key_secret_name: string | null;
  service_key_secret_name: string | null;
  is_active: boolean;
  last_used_at: string | null;
  notes: string | null;
  created_at: string;
};

const empty: Partial<EnvConnection> = {
  name: "",
  description: "",
  environment_type: "lovable",
  project_url: "",
  anon_key_secret_name: "",
  service_key_secret_name: "",
  is_active: true,
  notes: "",
};

const EnvironmentConnectionsSection = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<EnvConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EnvConnection> | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [allChecks, setAllChecks] = useState<Array<{ name: string; ok: boolean; latency_ms: number; error?: string; configured: boolean }> | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const runAllChecks = async () => {
    setCheckingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-connectors", { body: {} });
      if (error) throw error;
      setAllChecks(data?.checks ?? []);
      toast.success("Verificación completada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al verificar");
    } finally {
      setCheckingAll(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setIsSuperAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      setIsSuperAdmin(!!data);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("environment_connections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error cargando conexiones");
    setItems((data as EnvConnection[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  const save = async () => {
    if (!editing?.name || !editing?.project_url) {
      toast.error("Nombre y URL son obligatorios");
      return;
    }
    try {
      new URL(editing.project_url);
    } catch {
      toast.error("URL inválida");
      return;
    }

    const payload = {
      name: editing.name,
      description: editing.description ?? null,
      environment_type: editing.environment_type ?? "lovable",
      project_url: editing.project_url,
      anon_key_secret_name: editing.anon_key_secret_name?.trim() || null,
      service_key_secret_name: editing.service_key_secret_name?.trim() || null,
      is_active: editing.is_active ?? true,
      notes: editing.notes ?? null,
    };

    const res = editing.id
      ? await supabase.from("environment_connections").update(payload).eq("id", editing.id)
      : await supabase.from("environment_connections").insert(payload);

    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing.id ? "Conexión actualizada" : "Conexión creada");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta conexión? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("environment_connections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Conexión eliminada");
    load();
  };

  const test = async (id: string) => {
    setTesting(id);
    try {
      const { data, error } = await supabase.functions.invoke("test-environment-connection", {
        body: { connection_id: id },
      });
      if (error) throw error;
      const parts: string[] = [];
      parts.push(`URL: ${data.url_valid ? "OK" : "inválida"}`);
      if (data.anon_secret_configured !== null)
        parts.push(`Anon secret: ${data.anon_secret_configured ? "configurado" : "FALTA"}`);
      if (data.service_secret_configured !== null)
        parts.push(`Service secret: ${data.service_secret_configured ? "configurado" : "FALTA"}`);
      if (data.reachable !== null) parts.push(`Health: ${data.reachable ? "OK" : "fallo"}`);
      toast.success(parts.join(" · "));
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Fallo la prueba");
    } finally {
      setTesting(null);
    }
  };

  if (isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Acceso restringido
          </CardTitle>
          <CardDescription>
            Solo super administradores pueden gestionar conexiones de entorno.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Conexiones de Entorno
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Registra otros entornos (Lovable, Supabase u otros) referenciando el{" "}
            <strong>nombre de un secret de servidor</strong> que contiene la API key. Los valores
            sensibles nunca se almacenan ni se muestran aquí: viven como variables del backend y
            solo se usan desde edge functions.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing({ ...empty });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nueva conexión
        </Button>
      </div>

      <Card className="bg-muted/30 border-primary/20">
        <CardContent className="pt-6 flex gap-3 text-sm">
          <Lock className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="text-muted-foreground">
            Esta sección guarda metadatos (URL, descripción, nombres de secrets) con RLS para{" "}
            <code>super_admin</code>. Para añadir o rotar el valor real de una key, usa la sección{" "}
            <strong>API & Conexiones</strong> o el panel de secrets del backend.
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-primary" /> Verificar conectores
              </CardTitle>
              <CardDescription>
                Prueba todos los proveedores configurados (Firecrawl, Resend, Clip, Lovable AI, Amazon, Jina, ScrapingBee).
              </CardDescription>
            </div>
            <Button onClick={runAllChecks} disabled={checkingAll}>
              {checkingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}
              Probar todos
            </Button>
          </div>
        </CardHeader>
        {allChecks && (
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {allChecks.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-2 p-3 rounded border border-border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {!c.configured && <p className="text-[10px] text-muted-foreground">No configurado</p>}
                      {c.error && <p className="text-[10px] text-destructive truncate">{c.error}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{c.latency_ms}ms</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay conexiones registradas todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id} className={c.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{c.name}</CardTitle>
                    <CardDescription className="truncate">{c.project_url}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">{c.environment_type}</Badge>
                    {!c.is_active && <Badge variant="secondary">Inactiva</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {c.description && (
                  <p className="text-muted-foreground">{c.description}</p>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Anon key secret:</span>
                    {c.anon_key_secret_name ? (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted">
                        {c.anon_key_secret_name}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">— no configurado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Service key secret:</span>
                    {c.service_key_secret_name ? (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted">
                        {c.service_key_secret_name}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">— no configurado</span>
                    )}
                  </div>
                </div>
                {c.last_used_at && (
                  <p className="text-xs text-muted-foreground">
                    Última prueba: {new Date(c.last_used_at).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => test(c.id)}
                    disabled={testing === c.id}
                  >
                    {testing === c.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PlugZap className="h-4 w-4 mr-1" />
                    )}
                    Probar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(c.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar conexión" : "Nueva conexión"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ej. Sitio marketing Lovable"
                />
              </div>
              <div>
                <Label>Tipo de entorno</Label>
                <Select
                  value={editing.environment_type ?? "lovable"}
                  onValueChange={(v) => setEditing({ ...editing, environment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lovable">Lovable</SelectItem>
                    <SelectItem value="supabase">Supabase</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL del proyecto *</Label>
                <Input
                  value={editing.project_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, project_url: e.target.value })}
                  placeholder="https://xxxx.supabase.co"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Anon key — nombre del secret</Label>
                  <Input
                    value={editing.anon_key_secret_name ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, anon_key_secret_name: e.target.value })
                    }
                    placeholder="EXT_PROJECT_ANON_KEY"
                  />
                </div>
                <div>
                  <Label>Service key — nombre del secret</Label>
                  <Input
                    value={editing.service_key_secret_name ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, service_key_secret_name: e.target.value })
                    }
                    placeholder="EXT_PROJECT_SERVICE_KEY"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo se guarda el <em>nombre</em> de la variable de servidor. El valor real debe
                añadirse aparte como secret del backend.
              </p>
              <div>
                <Label>Notas</Label>
                <Textarea
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activa</Label>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnvironmentConnectionsSection;

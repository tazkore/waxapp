import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { toast } from "sonner";

type Check = {
  key: string;
  label: string;
  category: "function" | "route";
  required_role: "super_admin" | "admin" | "moderator" | "any";
  allowed: boolean;
  reason: string;
};

type AuditResponse = {
  user: { id: string; email: string; roles: string[] };
  checked_at: string;
  checks: Check[];
};

const roleColor = (r: string) => {
  switch (r) {
    case "super_admin": return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "admin": return "bg-primary/15 text-primary border-primary/30";
    case "moderator": return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function AccessAuditSection() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [auto, setAuto] = useState(true);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("audit-access");
      if (error) throw error;
      setData(res as AuditResponse);
    } catch (e: any) {
      toast.error(e.message || "Error ejecutando auditoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(run, 10000);
    return () => clearInterval(id);
  }, [auto]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.toLowerCase();
    return data.checks.filter(c =>
      !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
    );
  }, [data, filter]);

  const routes = filtered.filter(c => c.category === "route");
  const fns = filtered.filter(c => c.category === "function");

  const stats = useMemo(() => {
    if (!data) return { allow: 0, deny: 0, total: 0 };
    const allow = data.checks.filter(c => c.allowed).length;
    return { allow, deny: data.checks.length - allow, total: data.checks.length };
  }, [data]);

  const renderTable = (items: Check[]) => (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Recurso</TableHead>
            <TableHead>Rol requerido</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(c => (
            <TableRow key={`${c.category}-${c.key}`}>
              <TableCell>
                <div className="font-medium text-foreground">{c.label}</div>
                <div className="text-xs text-muted-foreground font-mono">{c.key}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{c.required_role.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>
                {c.allowed ? (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 gap-1">
                    <ShieldCheck className="h-3 w-3" /> ALLOW
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1">
                    <ShieldAlert className="h-3 w-3" /> DENY
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin resultados</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Auditoría de Acceso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verificación en tiempo real de rutas del admin y edge functions autorizadas para tu cuenta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAuto(a => !a)}>
            {auto ? "Auto: ON" : "Auto: OFF"}
          </Button>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Verificar</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Usuario</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{data?.user.email ?? "—"}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {(data?.user.roles ?? []).map(r => (
                <Badge key={r} variant="outline" className={roleColor(r)}>{r}</Badge>
              ))}
              {data && data.user.roles.length === 0 && (
                <Badge variant="outline" className="text-muted-foreground">sin roles</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Verificados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Permitidos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-500">{stats.allow}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Denegados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{stats.deny}</div></CardContent>
        </Card>
      </div>

      <Input
        placeholder="Filtrar por nombre o clave..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-md"
      />

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Rutas ({routes.length})</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions ({fns.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="routes" className="mt-4">{renderTable(routes)}</TabsContent>
        <TabsContent value="functions" className="mt-4">{renderTable(fns)}</TabsContent>
      </Tabs>

      {data && (
        <p className="text-xs text-muted-foreground">
          Última verificación: {new Date(data.checked_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

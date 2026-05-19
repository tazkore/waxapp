import { useState, useEffect } from "react";
import { Users, TrendingUp, MousePointerClick, DollarSign, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AffiliateRow {
  id: string;
  name: string;
  email: string;
  affiliate_code: string;
  status: string;
  commission_rate: number | null;
  created_at: string;
  total_clicks?: number;
  total_sales?: number;
  total_earned?: number;
}

const PAGE_SIZE = 10;

const statusLabel = (s: string) =>
  s === "active" ? "Activo" : s === "pending" ? "Pendiente" : s === "suspended" ? "Suspendido" : s;

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s === "active" ? "default" : s === "pending" ? "secondary" : "destructive";

export default function AfiliadosAdmin() {
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error cargando afiliados: " + error.message);
      setLoading(false);
      return;
    }

    // Enrich with click/sale totals
    const enriched = await Promise.all(
      (data ?? []).map(async (a: any) => {
        const [{ count: clicks }, { data: sales }] = await Promise.all([
          supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", a.id),
          supabase.from("affiliate_sales").select("commission_amount").eq("affiliate_id", a.id).eq("status", "paid"),
        ]);
        const totalEarned = (sales ?? []).reduce((sum: number, s: any) => sum + (s.commission_amount ?? 0), 0);
        return {
          id: a.id,
          name: a.name ?? a.full_name ?? "Sin nombre",
          email: a.email ?? "",
          affiliate_code: a.affiliate_code ?? a.ref_code ?? "—",
          status: a.status ?? "pending",
          commission_rate: a.commission_rate ?? null,
          created_at: a.created_at,
          total_clicks: clicks ?? 0,
          total_sales: (sales ?? []).length,
          total_earned: totalEarned,
        };
      })
    );

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.affiliate_code.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const totalClicks = rows.reduce((s, r) => s + (r.total_clicks ?? 0), 0);
  const totalSales = rows.reduce((s, r) => s + (r.total_sales ?? 0), 0);
  const totalEarned = rows.reduce((s, r) => s + (r.total_earned ?? 0), 0);
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard Afiliados</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Afiliados totales", value: rows.length, icon: Users },
          { label: "Clics totales", value: totalClicks.toLocaleString(), icon: MousePointerClick },
          { label: "Ventas pagadas", value: totalSales, icon: TrendingUp },
          { label: "Comisiones MXN", value: `$${totalEarned.toLocaleString()}`, icon: DollarSign },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold text-primary">{k.value}</p>
                </div>
                <k.icon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400">
          ⚠ {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} de afiliado pendiente{pendingCount !== 1 ? "s" : ""} de revisión.
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Afiliados registrados</CardTitle>
          <Input
            placeholder="Buscar por nombre, email o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 h-8 text-xs"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              {rows.length === 0 ? "No hay afiliados registrados aún." : "Sin resultados para esa búsqueda."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4">Nombre</th>
                    <th className="pb-3 pr-4">Código</th>
                    <th className="pb-3 pr-4 text-right">Clics</th>
                    <th className="pb-3 pr-4 text-right">Ventas</th>
                    <th className="pb-3 pr-4 text-right">Comisión</th>
                    <th className="pb-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paged.map((row) => (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <code className="text-xs bg-secondary px-2 py-0.5 rounded text-primary">{row.affiliate_code}</code>
                      </td>
                      <td className="py-3 pr-4 text-right">{(row.total_clicks ?? 0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right">{row.total_sales ?? 0}</td>
                      <td className="py-3 pr-4 text-right text-primary font-medium">
                        ${(row.total_earned ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>{filtered.length} afiliado{filtered.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>Pág {page} de {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

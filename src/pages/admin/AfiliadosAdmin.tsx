import { useState, useEffect } from "react";
import { Users, TrendingUp, MousePointerClick, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AffiliateRow {
  id: string;
  name: string;
  email: string;
  refCode: string;
  clicks: number;
  conversions: number;
  totalEarned: number;
  status: "active" | "pending" | "suspended";
}

const MOCK_DATA: AffiliateRow[] = [
  { id: "1", name: "Ana López", email: "ana@tienda.mx", refCode: "ANA47", clicks: 340, conversions: 12, totalEarned: 2400, status: "active" },
  { id: "2", name: "Carlos Vape", email: "carlos@vapeshop.mx", refCode: "CARLOS22", clicks: 178, conversions: 5, totalEarned: 890, status: "active" },
  { id: "3", name: "María Distribuidora", email: "maria@dist.mx", refCode: "MARIA99", clicks: 89, conversions: 2, totalEarned: 310, status: "pending" },
  { id: "4", name: "José Humo", email: "jose@humo.mx", refCode: "JOSE11", clicks: 420, conversions: 18, totalEarned: 3600, status: "active" },
  { id: "5", name: "Laura MX", email: "laura@mx.com", refCode: "LAURA66", clicks: 55, conversions: 0, totalEarned: 0, status: "pending" },
];

const PAGE_SIZE = 3;

export default function AfiliadosAdmin() {
  const [data] = useState<AffiliateRow[]>(MOCK_DATA);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = data.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.refCode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = data.reduce((s, r) => s + r.conversions, 0);
  const totalEarned = data.reduce((s, r) => s + r.totalEarned, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Afiliados</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Afiliados", value: data.length, icon: Users },
          { label: "Clics totales", value: totalClicks, icon: MousePointerClick },
          { label: "Conversiones", value: totalConversions, icon: TrendingUp },
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

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Afiliados registrados</CardTitle>
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-xs"
          />
        </CardHeader>
        <CardContent>
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
                      <code className="text-xs bg-secondary px-2 py-0.5 rounded text-primary">{row.refCode}</code>
                    </td>
                    <td className="py-3 pr-4 text-right">{row.clicks.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right">{row.conversions}</td>
                    <td className="py-3 pr-4 text-right text-primary font-medium">${row.totalEarned.toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <Badge
                        variant={
                          row.status === "active" ? "default" :
                          row.status === "pending" ? "secondary" : "destructive"
                        }
                      >
                        {row.status === "active" ? "Activo" : row.status === "pending" ? "Pendiente" : "Suspendido"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>{filtered.length} afiliado{filtered.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span>Pág {page} de {totalPages || 1}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

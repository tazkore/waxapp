import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Issue {
  level: "error" | "warning" | "ok";
  message: string;
}

interface Props {
  jsonLd: any;
}

const SchemaValidator = ({ jsonLd }: Props) => {
  const issues = useMemo<Issue[]>(() => {
    const out: Issue[] = [];
    const t = jsonLd?.["@type"];
    if (!t) out.push({ level: "error", message: "Falta @type" });
    if (!jsonLd?.name) out.push({ level: "error", message: "Falta name" });
    if (t === "Product") {
      if (!jsonLd.image) out.push({ level: "error", message: "Product requiere image" });
      if (!jsonLd.offers?.price) out.push({ level: "error", message: "offers.price requerido" });
      if (!jsonLd.offers?.priceCurrency)
        out.push({ level: "warning", message: "offers.priceCurrency recomendado" });
      if (!jsonLd.brand) out.push({ level: "warning", message: "brand recomendado para rich result" });
      if (!jsonLd.description) out.push({ level: "warning", message: "description recomendado" });
      if (!jsonLd.sku && !jsonLd.gtin && !jsonLd.mpn)
        out.push({ level: "warning", message: "Añade sku, gtin o mpn para mejor identificación" });
    }
    if (out.length === 0) out.push({ level: "ok", message: "Schema válido — listo para Google" });
    return out;
  }, [jsonLd]);

  const hasErrors = issues.some((i) => i.level === "error");

  return (
    <div className="space-y-3">
      <Card className={hasErrors ? "border-destructive/40" : "border-primary/40"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase text-muted-foreground flex items-center gap-2">
            Validación Rich Results{" "}
            <Badge variant="outline" className={hasErrors ? "text-destructive border-destructive/40" : "text-primary border-primary/40"}>
              {hasErrors ? "Con errores" : "Listo"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {issues.map((i, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {i.level === "error" && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
              {i.level === "warning" && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
              {i.level === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
              <span className="text-foreground/80">{i.message}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {jsonLd?.["@type"] === "Product" && jsonLd.name && jsonLd.offers?.price && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Vista previa Rich Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3">
              {jsonLd.image && (
                <img
                  src={Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image}
                  alt=""
                  className="h-16 w-16 rounded object-cover bg-background"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{jsonLd.name}</p>
                <p className="text-xs text-amber-500">★★★★☆ (sin reviews aún)</p>
                <p className="text-sm text-foreground">
                  ${jsonLd.offers.price} {jsonLd.offers.priceCurrency || "MXN"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {jsonLd.brand?.name || jsonLd.brand || "Sin marca"} ·{" "}
                  {jsonLd.offers.availability?.includes("InStock") ? "En stock" : "Agotado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchemaValidator;

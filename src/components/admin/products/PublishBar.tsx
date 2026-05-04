import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket } from "lucide-react";
import { aggregateValidation } from "@/lib/validateProductRow";

interface Props {
  products: any[];
  selectedIdx: Set<number>;
  busy: boolean;
  canImport: boolean;
  onPublish: () => void;
}

const PublishBar = ({ products, selectedIdx, busy, canImport, onPublish }: Props) => {
  if (products.length === 0) return null;

  const selectedItems = Array.from(selectedIdx).map((i) => products[i]).filter(Boolean);
  const stats = aggregateValidation(selectedItems);
  const totalStats = aggregateValidation(products);

  const noneSelected = selectedItems.length === 0;
  const allBlocked = selectedItems.length > 0 && stats.ready === 0;
  const disabled = busy || !canImport || noneSelected || allBlocked;

  return (
    <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-[hsl(var(--background))]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            {selectedItems.length} seleccionados / {products.length} en staging
          </Badge>
          {stats.ready > 0 && (
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              ✓ {stats.ready} listos
            </Badge>
          )}
          {stats.withErrors > 0 && (
            <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">
              ✕ {stats.withErrors} con errores
            </Badge>
          )}
          <span className="text-muted-foreground">
            Completitud media:{" "}
            <strong className={
              totalStats.avgCompleteness >= 70 ? "text-primary" :
              totalStats.avgCompleteness >= 40 ? "text-amber-400" : "text-destructive"
            }>
              {totalStats.avgCompleteness}%
            </strong>
          </span>
        </div>

        <Button
          onClick={onPublish}
          disabled={disabled}
          size="lg"
          className="gap-2 h-12 px-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_hsl(var(--primary)/0.4)]"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
          Publicar en inventario
          {stats.ready > 0 && ` (${stats.ready})`}
        </Button>
      </div>
      {!canImport && (
        <p className="text-[11px] text-destructive mt-2 text-right">
          Tu rol actual no puede insertar productos. Contacta a un super admin.
        </p>
      )}
      {selectedItems.length > 0 && stats.withErrors > 0 && stats.ready > 0 && (
        <p className="text-[11px] text-amber-400 mt-2 text-right">
          Se omitirán {stats.withErrors} producto(s) inválidos al publicar.
        </p>
      )}
    </div>
  );
};

export default PublishBar;

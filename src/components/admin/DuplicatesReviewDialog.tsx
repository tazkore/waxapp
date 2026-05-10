import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RefreshCw, X, CheckCheck, FlipVertical2 } from "lucide-react";
import type { ImportDuplicate } from "@/lib/exportImportReport";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  duplicates: ImportDuplicate[];
  /** Indexes (matching duplicate.index) the user chose to overwrite */
  onApply: (overwriteIndexes: number[]) => void;
  loading?: boolean;
}

const DuplicatesReviewDialog = ({ open, onOpenChange, duplicates, onApply, loading = false }: Props) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, duplicates]);

  const allIdx = useMemo(() => duplicates.map((d) => d.index), [duplicates]);

  const toggle = (idx: number) => {
    const next = new Set(selected);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelected(next);
  };

  const overwriteAll = () => setSelected(new Set(allIdx));
  const skipAll = () => setSelected(new Set());
  const invert = () => setSelected(new Set(allIdx.filter((i) => !selected.has(i))));

  const overwriteCount = selected.size;
  const skipCount = duplicates.length - overwriteCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[hsl(var(--accent)/0.15)] p-2 ring-1 ring-[hsl(var(--accent)/0.3)]">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--accent))]" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Productos duplicados detectados</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Se encontraron <span className="text-foreground font-semibold">{duplicates.length}</span> producto(s) ya
                existente(s) por SKU o nombre. Marca cuáles quieres <span className="text-primary font-semibold">sobrescribir</span>.
                Los no marcados se omitirán.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 py-2 border-y border-border">
          <Button size="sm" variant="outline" onClick={overwriteAll} className="h-8">
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Sobrescribir todos
          </Button>
          <Button size="sm" variant="outline" onClick={skipAll} className="h-8">
            <X className="h-3.5 w-3.5 mr-1.5" /> Omitir todos
          </Button>
          <Button size="sm" variant="ghost" onClick={invert} className="h-8">
            <FlipVertical2 className="h-3.5 w-3.5 mr-1.5" /> Invertir
          </Button>
          <div className="ml-auto flex gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {overwriteCount} sobrescribir
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {skipCount} omitir
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[420px] pr-3">
          <div className="space-y-2">
            {duplicates.map((d) => {
              const checked = selected.has(d.index);
              return (
                <label
                  key={d.index}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                    checked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(d.index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.sku && (
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {d.sku}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coincide con: <span className="text-foreground">{d.existing_name ?? d.existing_id}</span>
                    </p>
                    <p className="text-[11px] text-[hsl(var(--accent))] mt-0.5">{d.reason}</p>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold">
                    {checked ? (
                      <span className="text-primary">Sobrescribir</span>
                    ) : (
                      <span className="text-muted-foreground">Omitir</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onApply(Array.from(selected))}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar ({overwriteCount} sobrescribir, {skipCount} omitir)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatesReviewDialog;

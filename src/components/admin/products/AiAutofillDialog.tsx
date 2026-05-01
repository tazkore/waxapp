import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FIELD_LABELS: Record<string, string> = {
  short_description: "Descripción corta",
  description: "Descripción",
  long_description_html: "Descripción larga (HTML)",
  category: "Categoría",
  tags: "Etiquetas",
  meta_title: "Meta título",
  meta_description: "Meta descripción",
  focus_keyword: "Palabra clave",
  meta_keywords: "Palabras clave",
  attributes: "Atributos (sabores, ingredientes…)",
};

const formatVal = (v: any) => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
};

const AiAutofillDialog = ({
  open,
  onClose,
  product,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  product: any;
  onApply: (proposal: Record<string, any>) => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Record<string, any> | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setProposal(null);
    setPicked(new Set());
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("product-autofill", {
          body: { product, only_missing: false },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        setProposal(data.proposal || {});
        setPicked(new Set(Object.keys(data.proposal || {})));
      } catch (e: any) {
        toast({ title: "Error IA", description: e?.message || String(e), variant: "destructive" });
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = () => {
    if (!proposal) return;
    const out: Record<string, any> = {};
    for (const k of picked) out[k] = proposal[k];
    onApply(out);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Completar con IA
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Generando propuestas…</span>
          </div>
        )}

        {!loading && proposal && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Selecciona qué campos quieres aplicar. Los actuales se reemplazarán por la propuesta de IA.
            </p>
            {Object.keys(proposal).length === 0 && (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">Sin sugerencias.</CardContent></Card>
            )}
            {Object.entries(proposal).map(([k, v]) => {
              const cur = (product as any)[k];
              const isPicked = picked.has(k);
              return (
                <Card key={k} className={isPicked ? "border-primary/40" : ""}>
                  <CardContent className="p-3 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isPicked}
                          onCheckedChange={(c) => {
                            const n = new Set(picked);
                            c ? n.add(k) : n.delete(k);
                            setPicked(n);
                          }}
                        />
                        <span className="font-medium text-sm">{FIELD_LABELS[k] || k}</span>
                      </div>
                      {cur && cur !== "" && !(Array.isArray(cur) && cur.length === 0) && (
                        <Badge variant="outline" className="text-[10px]">reemplazará</Badge>
                      )}
                    </label>
                    <pre className="text-xs bg-muted/50 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap break-words">
                      {formatVal(v)}
                    </pre>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={apply} disabled={loading || !proposal || picked.size === 0} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Aplicar {picked.size} campo{picked.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiAutofillDialog;

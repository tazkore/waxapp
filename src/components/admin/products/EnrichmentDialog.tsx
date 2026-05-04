import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, FileText, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeSeoMetadata } from "@/lib/normalizeSeoMetadata";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: any | null;
  index: number | null;
  /** Patch the in-memory staging row */
  onPatch: (i: number, patch: Record<string, any>) => void;
  /** Trigger AI autofill for this row */
  onRunAi: (i: number) => Promise<void> | void;
  aiBusy: boolean;
}

const charColor = (n: number, min: number, max: number) =>
  n === 0 ? "text-muted-foreground" : n < min || n > max ? "text-amber-400" : "text-primary";

const EnrichmentDialog = ({ open, onOpenChange, product, index, onPatch, onRunAi, aiBusy }: Props) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<any>({});

  useEffect(() => {
    if (product) setDraft({ ...product });
  }, [product, open]);

  if (!product || index == null) return null;

  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const tagsStr = Array.isArray(draft.tags) ? draft.tags.join(", ") : "";

  const runNormalize = () => {
    const { patch, changes } = normalizeSeoMetadata(draft);
    if (Object.keys(patch).length === 0) {
      toast({ title: "SEO ya está completo" });
      return;
    }
    setDraft((d: any) => ({ ...d, ...patch }));
    toast({ title: "SEO normalizado", description: changes.join(" · ") });
  };

  const save = () => {
    const patch: Record<string, any> = {};
    for (const k of Object.keys(draft)) {
      if (draft[k] !== product[k]) patch[k] = draft[k];
    }
    if (Object.keys(patch).length === 0) {
      toast({ title: "Sin cambios" });
      onOpenChange(false);
      return;
    }
    onPatch(index, patch);
    toast({
      title: "Producto actualizado",
      description: `${Object.keys(patch).length} campo(s) modificado(s) en staging`,
    });
    onOpenChange(false);
  };

  const mt = (draft.meta_title || "").length;
  const md = (draft.meta_description || "").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Enriquecer producto con IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edita y enriquece los datos brutos. Los cambios solo afectan a staging hasta que publiques.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="clean" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="clean">Datos limpios</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          </TabsList>

          {/* ---------- Clean data ---------- */}
          <TabsContent value="clean" className="space-y-3 pt-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Nombre limpio
              </label>
              <Input value={draft.name || ""} onChange={(e) => set("name", e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Original: <span className="italic">{product.name || "—"}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoría</label>
                <Input value={draft.category || ""} onChange={(e) => set("category", e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Marca</label>
                <Input
                  value={draft.brand || draft.brand_name || ""}
                  onChange={(e) => {
                    set("brand", e.target.value);
                    set("brand_name", e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Precio MXN</label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.price ?? ""}
                  onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">SKU</label>
                <Input value={draft.sku || ""} onChange={(e) => set("sku", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">GTIN / Código de barras</label>
                <Input value={draft.gtin || ""} onChange={(e) => set("gtin", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
              <Textarea
                rows={4}
                value={draft.description || ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </TabsContent>

          {/* ---------- SEO ---------- */}
          <TabsContent value="seo" className="space-y-3 pt-3">
            <div className="flex flex-wrap gap-2 pb-1">
              <Button
                size="sm"
                onClick={() => index != null && onRunAi(index)}
                disabled={aiBusy}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
              >
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Generar con IA
              </Button>
              <Button size="sm" variant="outline" onClick={runNormalize} className="gap-2 border-primary/40 text-primary">
                <FileText className="h-3.5 w-3.5" /> Normalizar
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Meta título</label>
                <span className={`text-[10px] font-mono ${charColor(mt, 30, 60)}`}>{mt}/60</span>
              </div>
              <Input value={draft.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Meta descripción</label>
                <span className={`text-[10px] font-mono ${charColor(md, 70, 160)}`}>{md}/160</span>
              </div>
              <Textarea
                rows={2}
                value={draft.meta_description || ""}
                onChange={(e) => set("meta_description", e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Focus keyword</label>
              <Input value={draft.focus_keyword || ""} onChange={(e) => set("focus_keyword", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tags (separados por coma)
              </label>
              <Input
                value={tagsStr}
                onChange={(e) =>
                  set(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean),
                  )
                }
                placeholder="vape, nano, relax"
              />
              {Array.isArray(draft.tags) && draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {draft.tags.map((t: string, k: number) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ---------- Advanced ---------- */}
          <TabsContent value="advanced" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Atributos estructurados (sabores, ingredientes, especificaciones). Usa <strong>Generar con IA</strong> en la
              pestaña SEO para autocompletar también estos campos.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Sabores (coma)</label>
                <Input
                  value={(draft.flavor_profile || []).join(", ")}
                  onChange={(e) => set("flavor_profile", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingredientes (coma)</label>
                <Input
                  value={(draft.ingredients || []).join(", ")}
                  onChange={(e) => set("ingredients", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de evaporador</label>
                <Input value={draft.vaporizer_type || ""} onChange={(e) => set("vaporizer_type", e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Capacidad (ml)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={draft.capacity_ml ?? ""}
                  onChange={(e) => set("capacity_ml", parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Batería (mAh)</label>
                <Input
                  type="number"
                  value={draft.battery_mah ?? ""}
                  onChange={(e) => set("battery_mah", parseInt(e.target.value) || null)}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Puffs estimados</label>
                <Input
                  type="number"
                  value={draft.puffs_estimate ?? ""}
                  onChange={(e) => set("puffs_estimate", parseInt(e.target.value) || null)}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Advertencias regulatorias (una por línea)
              </label>
              <Textarea
                rows={3}
                value={(draft.warnings || []).join("\n")}
                onChange={(e) => set("warnings", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            onClick={save}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
          >
            <Save className="h-4 w-4" /> Guardar en staging
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichmentDialog;

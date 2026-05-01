import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, Package, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ProductVariantRow = {
  id?: string;
  product_id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  is_active: boolean;
  image_url?: string | null;
  image_urls?: string[];
  weight_grams?: number | null;
  flavor?: string | null;
  color?: string | null;
  size_label?: string | null;
  nicotine_mg?: number | null;
  capacity_ml?: number | null;
  notes?: string | null;
  attributes?: Record<string, string>;
};

const empty = (): ProductVariantRow => ({
  name: "",
  sku: "",
  barcode: "",
  price: 0,
  compare_at_price: null,
  stock: 0,
  is_active: true,
  image_url: "",
  image_urls: [],
  weight_grams: null,
  flavor: "",
  color: "",
  size_label: "",
  nicotine_mg: null,
  capacity_ml: null,
  notes: "",
  attributes: {},
});

interface Props {
  productId: string | null;
  /** Si productId es null (producto nuevo) usamos estado en memoria */
  initialVariants?: ProductVariantRow[];
  onChange?: (v: ProductVariantRow[]) => void;
}

const VariantMetadataEditor = ({ productId, initialVariants, onChange }: Props) => {
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariantRow[]>(initialVariants || []);
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!productId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      if (error) {
        toast({ title: "Error al cargar variantes", description: error.message, variant: "destructive" });
      }
      setVariants(((data as any[]) || []).map((v) => ({ ...empty(), ...v })));
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [productId, toast]);

  const update = (idx: number, patch: Partial<ProductVariantRow>) => {
    const next = variants.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    setVariants(next);
    onChange?.(next);
  };

  const addNew = () => {
    const next = [...variants, empty()];
    setVariants(next);
    setExpanded((s) => new Set([...s, next.length - 1]));
    onChange?.(next);
  };

  const remove = async (idx: number) => {
    const v = variants[idx];
    if (v.id && productId) {
      if (!confirm("¿Eliminar esta variante?")) return;
      const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
      if (error) {
        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
        return;
      }
    }
    const next = variants.filter((_, i) => i !== idx);
    setVariants(next);
    onChange?.(next);
  };

  const persist = async (idx: number) => {
    if (!productId) {
      toast({ title: "Guarda el producto primero" });
      return;
    }
    const v = variants[idx];
    if (!v.name.trim()) {
      toast({ title: "Nombre de variante obligatorio", variant: "destructive" });
      return;
    }
    setSavingIdx(idx);
    const payload: any = {
      product_id: productId,
      name: v.name.trim(),
      sku: v.sku || null,
      barcode: v.barcode || null,
      price: Number(v.price) || 0,
      compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
      stock: Number(v.stock) || 0,
      is_active: !!v.is_active,
      image_url: v.image_url || null,
      image_urls: v.image_urls || [],
      weight_grams: v.weight_grams != null ? Number(v.weight_grams) : null,
      flavor: v.flavor || null,
      color: v.color || null,
      size_label: v.size_label || null,
      nicotine_mg: v.nicotine_mg != null ? Number(v.nicotine_mg) : null,
      capacity_ml: v.capacity_ml != null ? Number(v.capacity_ml) : null,
      notes: v.notes || null,
      attributes: v.attributes || {},
    };
    const { data, error } = v.id
      ? await supabase.from("product_variants").update(payload).eq("id", v.id).select().single()
      : await supabase.from("product_variants").insert(payload).select().single();
    setSavingIdx(null);
    if (error) {
      toast({ title: "Error al guardar variante", description: error.message, variant: "destructive" });
      return;
    }
    update(idx, { ...empty(), ...(data as any) });
    toast({ title: "Variante guardada" });
  };

  const toggle = (idx: number) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const editAttr = (idx: number, k: string, val: string, oldKey?: string) => {
    const v = variants[idx];
    const attrs = { ...(v.attributes || {}) };
    if (oldKey && oldKey !== k) delete attrs[oldKey];
    if (k) attrs[k] = val;
    update(idx, { attributes: attrs });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Package className="h-3.5 w-3.5" />
          {variants.length} {variants.length === 1 ? "variante" : "variantes"}
          {!productId && " · guarda el producto primero para persistirlas"}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={addNew} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Añadir variante
        </Button>
      </div>

      {variants.length === 0 && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sin variantes. Añade una para gestionar sabores, colores, capacidades, etc.
          </CardContent>
        </Card>
      )}

      {variants.map((v, idx) => {
        const isOpen = expanded.has(idx);
        const attrEntries = Object.entries(v.attributes || {});
        return (
          <Card key={v.id || idx} className="border-border/60 bg-card/60">
            <CardContent className="p-3 space-y-3">
              {/* Header row: nombre + precio + stock + toggle */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-4 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nombre variante *</Label>
                  <Input value={v.name} onChange={(e) => update(idx, { name: e.target.value })} placeholder="Ej. Mango 50mg" />
                </div>
                <div className="col-span-6 md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">SKU</Label>
                  <Input value={v.sku || ""} onChange={(e) => update(idx, { sku: e.target.value })} />
                </div>
                <div className="col-span-6 md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Precio (MXN)</Label>
                  <Input type="number" value={v.price} onChange={(e) => update(idx, { price: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 md:col-span-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Stock</Label>
                  <Input type="number" value={v.stock} onChange={(e) => update(idx, { stock: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 md:col-span-3 flex items-center gap-2 justify-end">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={v.is_active} onCheckedChange={(c) => update(idx, { is_active: !!c })} /> Activa
                  </label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => toggle(idx)}>
                    {isOpen ? "Menos" : "Más"}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Quick badges resumen */}
              {!isOpen && (
                <div className="flex flex-wrap gap-1.5">
                  {v.flavor && <Badge variant="outline" className="text-[10px]">🍓 {v.flavor}</Badge>}
                  {v.color && <Badge variant="outline" className="text-[10px]">🎨 {v.color}</Badge>}
                  {v.size_label && <Badge variant="outline" className="text-[10px]">📏 {v.size_label}</Badge>}
                  {v.nicotine_mg != null && <Badge variant="outline" className="text-[10px]">{v.nicotine_mg}mg nic</Badge>}
                  {v.capacity_ml != null && <Badge variant="outline" className="text-[10px]">{v.capacity_ml}mL</Badge>}
                  {v.barcode && <Badge variant="outline" className="text-[10px]">EAN {v.barcode}</Badge>}
                  {attrEntries.length > 0 && <Badge variant="outline" className="text-[10px]">+{attrEntries.length} attr</Badge>}
                </div>
              )}

              {isOpen && (
                <>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Código de barras (EAN/UPC)</Label>
                      <Input value={v.barcode || ""} onChange={(e) => update(idx, { barcode: e.target.value })} />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Precio comparativo</Label>
                      <Input type="number" value={v.compare_at_price ?? ""} onChange={(e) => update(idx, { compare_at_price: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Peso (g)</Label>
                      <Input type="number" step="0.01" value={v.weight_grams ?? ""} onChange={(e) => update(idx, { weight_grams: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Talla / Medida</Label>
                      <Input value={v.size_label || ""} onChange={(e) => update(idx, { size_label: e.target.value })} placeholder="S, 30mL, 1g…" />
                    </div>
                    <div className="col-span-6 md:col-span-4 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sabor</Label>
                      <Input value={v.flavor || ""} onChange={(e) => update(idx, { flavor: e.target.value })} placeholder="Mango ice, Menta…" />
                    </div>
                    <div className="col-span-6 md:col-span-4 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <Input value={v.color || ""} onChange={(e) => update(idx, { color: e.target.value })} placeholder="Negro mate, Plata…" />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nicotina (mg)</Label>
                      <Input type="number" step="0.1" value={v.nicotine_mg ?? ""} onChange={(e) => update(idx, { nicotine_mg: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Capacidad (mL)</Label>
                      <Input type="number" step="0.1" value={v.capacity_ml ?? ""} onChange={(e) => update(idx, { capacity_ml: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                  </div>

                  {/* Imágenes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3 w-3" /> Imagen principal de la variante
                    </Label>
                    <Input value={v.image_url || ""} onChange={(e) => update(idx, { image_url: e.target.value })} placeholder="https://…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Galería extra (URLs separadas por coma)</Label>
                    <Input
                      value={(v.image_urls || []).join(", ")}
                      onChange={(e) => update(idx, { image_urls: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>

                  {/* Atributos clave/valor libres */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Atributos personalizados</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs gap-1"
                        onClick={() => editAttr(idx, `attr_${attrEntries.length + 1}`, "")}
                      >
                        <Plus className="h-3 w-3" /> Añadir
                      </Button>
                    </div>
                    {attrEntries.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Pares libres tipo "color_secundario: dorado".</p>
                    )}
                    {attrEntries.map(([k, val]) => (
                      <div key={k} className="grid grid-cols-12 gap-2">
                        <Input
                          className="col-span-4"
                          value={k}
                          onChange={(e) => editAttr(idx, e.target.value, val, k)}
                        />
                        <Input
                          className="col-span-7"
                          value={val}
                          onChange={(e) => editAttr(idx, k, e.target.value)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="col-span-1"
                          onClick={() => {
                            const a = { ...(v.attributes || {}) };
                            delete a[k];
                            update(idx, { attributes: a });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Notas */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notas internas</Label>
                    <Input value={v.notes || ""} onChange={(e) => update(idx, { notes: e.target.value })} placeholder="Solo visible para staff" />
                  </div>

                  {/* Persistir */}
                  {productId && (
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={() => persist(idx)} disabled={savingIdx === idx} className="gap-1.5">
                        {savingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Guardar variante
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Patch import
import { X } from "lucide-react";

export default VariantMetadataEditor;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Trash2, Image as ImageIcon, RefreshCw, Eye, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DraftProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  sku: string | null;
  description: string | null;
  stock: number;
  created_at: string;
}

const ImportedProductsPreviewSection = () => {
  const [items, setItems] = useState<DraftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, Partial<DraftProduct>>>({});
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,category,image_url,sku,description,stock,created_at")
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)));
  };

  const setEdit = (id: string, field: keyof DraftProduct, value: any) => {
    setEdits({ ...edits, [id]: { ...edits[id], [field]: value } });
  };

  const persistEdit = async (id: string) => {
    const patch = edits[id];
    if (!patch) return;
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems(items.map((p) => (p.id === id ? { ...p, ...patch } as DraftProduct : p)));
    const { [id]: _, ...rest } = edits;
    setEdits(rest);
    toast({ title: "Cambios guardados" });
  };

  const activate = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("products")
      .update({ is_active: true })
      .in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Error al activar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${ids.length} productos activados`, description: "Ya son visibles en la tienda" });
    setSelected(new Set());
    load();
  };

  const remove = async () => {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} borradores? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("products").delete().in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${ids.length} borradores eliminados` });
    setSelected(new Set());
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Previsualizar Productos Importados
          </h2>
          <p className="text-sm text-muted-foreground">
            Revisa título, precio, imagen y categoría antes de publicarlos en la tienda. Solo se muestran productos inactivos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Recargar
        </Button>
      </div>

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre, categoría o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="outline">{filtered.length} borradores</Badge>
          <Badge variant="outline" className="border-primary/40 text-primary">{selected.size} seleccionados</Badge>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
              {selected.size === filtered.length && filtered.length > 0 ? "Quitar selección" : "Seleccionar todos"}
            </Button>
            <Button variant="destructive" size="sm" onClick={remove} disabled={selected.size === 0 || busy}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
            <Button size="sm" onClick={activate} disabled={selected.size === 0 || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Activar en tienda
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <PackageCheck className="h-10 w-10 mx-auto text-primary/60" />
            <p className="font-medium">No hay productos pendientes de revisión</p>
            <p className="text-xs">Cuando importes un sitio, los productos aparecerán aquí como borradores.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const e = edits[p.id] || {};
            const cur = { ...p, ...e };
            const dirty = Object.keys(e).length > 0;
            const isSel = selected.has(p.id);
            return (
              <Card
                key={p.id}
                className={`overflow-hidden transition ${isSel ? "ring-2 ring-primary" : ""}`}
              >
                <div className="relative aspect-square bg-muted">
                  {cur.image_url ? (
                    <img src={cur.image_url} alt={cur.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => toggle(p.id)}
                      className="bg-background/90 border-2"
                    />
                  </div>
                  <Badge className="absolute top-2 right-2" variant="secondary">Borrador</Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <Input
                    value={cur.name}
                    onChange={(ev) => setEdit(p.id, "name", ev.target.value)}
                    className="font-medium text-sm"
                    placeholder="Nombre"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Precio MXN</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cur.price ?? 0}
                        onChange={(ev) => setEdit(p.id, "price", parseFloat(ev.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Stock</label>
                      <Input
                        type="number"
                        value={cur.stock ?? 0}
                        onChange={(ev) => setEdit(p.id, "stock", parseInt(ev.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Categoría</label>
                    <Input
                      value={cur.category || ""}
                      onChange={(ev) => setEdit(p.id, "category", ev.target.value)}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Imagen URL</label>
                    <Input
                      value={cur.image_url || ""}
                      onChange={(ev) => setEdit(p.id, "image_url", ev.target.value)}
                      placeholder="https://…"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    {dirty && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => persistEdit(p.id)}>
                        Guardar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        if (dirty) await persistEdit(p.id);
                        const { error } = await supabase.from("products").update({ is_active: true }).eq("id", p.id);
                        if (error) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Activado", description: cur.name });
                          load();
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Activar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImportedProductsPreviewSection;

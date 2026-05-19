import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Trash2, Image as ImageIcon, RefreshCw, Eye, PackageCheck, Sparkles } from "lucide-react";
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

interface AiResult {
  description: string;
  categories: string[];
  meta_tags: string[];
}

const getGeminiModel = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("VITE_GEMINI_API_KEY no configurada");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

const fillWithAI = async (productName: string): Promise<AiResult> => {
  const model = getGeminiModel();
  const prompt = `Eres un experto en marketing de cannabis, CBD y vapes. Para el producto "${productName}" en una tienda mexicana premium (WAXAPP), genera SOLO un JSON válido sin markdown ni bloques de código con esta estructura exacta:
{
  "description": "Descripción SEO atractiva de 2-3 oraciones, en español mexicano, destacando beneficios y características únicas del producto",
  "categories": ["categoría1", "categoría2"],
  "meta_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Las categorías deben ser relevantes al producto (CBD, THC, Vape, Edibles, Nano, etc). Los meta_tags deben ser palabras clave SEO en español.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Strip markdown code blocks if present
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean);
};

const ImportedProductsPreviewSection = () => {
  const [items, setItems] = useState<DraftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState<Set<string>>(new Set());
  const [batchAiLoading, setBatchAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, Partial<DraftProduct>>>({});
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;
  const { toast } = useToast();

  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  const load = async (targetPage = 0) => {
    setLoading(true);
    const from = targetPage * PAGE_SIZE;
    const { data, error, count } = await supabase
      .from("products")
      .select("id,name,price,category,image_url,sku,description,stock,created_at", { count: "exact" })
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
      setTotalCount(count ?? 0);
      setPage(targetPage);
    }
    setLoading(false);
  };

  useEffect(() => { load(0); }, []);

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
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const persistEdit = async (id: string) => {
    const patch = edits[id];
    if (!patch) return;
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as DraftProduct : p)));
    setEdits((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    toast({ title: "Cambios guardados" });
  };

  const fillOneWithAI = async (productId: string, productName: string) => {
    if (!hasGeminiKey) {
      toast({ title: "VITE_GEMINI_API_KEY no configurada", description: "Añade la key en tu archivo .env", variant: "destructive" });
      return;
    }
    setAiLoading((prev) => new Set([...prev, productId]));
    try {
      const ai = await fillWithAI(productName);
      const patch: Partial<DraftProduct> = {
        description: ai.description,
        category: ai.categories?.[0] ?? null,
      };
      const { error } = await supabase.from("products").update({
        ...patch,
        // Store meta_tags in description suffix if no dedicated column
      }).eq("id", productId);
      if (error) throw error;
      setEdits((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
      setItems((prev) => prev.map((p) => p.id === productId ? { ...p, ...patch } as DraftProduct : p));
      toast({ title: "✨ IA completó los datos", description: `${productName} · ${ai.categories.join(", ")}` });
    } catch (e: any) {
      toast({ title: "Error IA", description: e?.message ?? "Error desconocido", variant: "destructive" });
    } finally {
      setAiLoading((prev) => { const s = new Set(prev); s.delete(productId); return s; });
    }
  };

  const fillBatchWithAI = async () => {
    if (!hasGeminiKey) {
      toast({ title: "VITE_GEMINI_API_KEY no configurada", variant: "destructive" });
      return;
    }
    const targets = selected.size > 0
      ? filtered.filter((p) => selected.has(p.id))
      : filtered.filter((p) => !p.description);
    if (targets.length === 0) {
      toast({ title: "No hay productos a completar" });
      return;
    }
    setBatchAiLoading(true);
    let done = 0;
    for (const p of targets) {
      try {
        await fillOneWithAI(p.id, p.name);
        done++;
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 800));
      } catch {
        // continue with others
      }
    }
    setBatchAiLoading(false);
    toast({ title: `✨ IA completó ${done}/${targets.length} productos` });
  };

  const activate = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("products").update({ is_active: true }).in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Error al activar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${ids.length} productos activados`, description: "Ya son visibles en la tienda" });
    setSelected(new Set());
    load(0);
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
            Revisa, edita y completa datos con IA antes de publicar. Solo se muestran borradores (inactivos).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(0)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Recargar
        </Button>
      </div>

      {!hasGeminiKey && (
        <div className="px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400">
          ⚠ <code className="font-mono">VITE_GEMINI_API_KEY</code> no está configurada — el botón IA estará desactivado.
          Añádela en tu archivo <code className="font-mono">.env</code> y reinicia el servidor.
        </div>
      )}

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre, categoría o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="outline">{totalCount} borradores</Badge>
          {selected.size > 0 && (
            <Badge variant="outline" className="border-primary/40 text-primary">{selected.size} seleccionados</Badge>
          )}
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
              {selected.size === filtered.length && filtered.length > 0 ? "Quitar selección" : "Seleccionar todos"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fillBatchWithAI}
              disabled={!hasGeminiKey || batchAiLoading || filtered.length === 0}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {batchAiLoading
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-1" />}
              {selected.size > 0 ? `Llenar ${selected.size} con IA` : "Llenar vacíos con IA"}
            </Button>
            <Button variant="destructive" size="sm" onClick={remove} disabled={selected.size === 0 || busy}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
            <Button size="sm" onClick={activate} disabled={selected.size === 0 || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Publicar en tienda
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
            const isAiLoading = aiLoading.has(p.id);
            return (
              <Card key={p.id} className={`overflow-hidden transition ${isSel ? "ring-2 ring-primary" : ""}`}>
                <div className="relative aspect-square bg-muted">
                  {cur.image_url ? (
                    <img src={cur.image_url} alt={cur.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Checkbox checked={isSel} onCheckedChange={() => toggle(p.id)} className="bg-background/90 border-2" />
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
                      <Input type="number" step="0.01" value={cur.price ?? 0}
                        onChange={(ev) => setEdit(p.id, "price", parseFloat(ev.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Stock</label>
                      <Input type="number" value={cur.stock ?? 0}
                        onChange={(ev) => setEdit(p.id, "stock", parseInt(ev.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Categoría</label>
                    <Input value={cur.category || ""} onChange={(ev) => setEdit(p.id, "category", ev.target.value)} placeholder="—" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Imagen URL</label>
                    <Input value={cur.image_url || ""} onChange={(ev) => setEdit(p.id, "image_url", ev.target.value)}
                      placeholder="https://…" className="text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">SKU</label>
                    <Input value={cur.sku || ""} onChange={(ev) => setEdit(p.id, "sku", ev.target.value || null)}
                      placeholder="—" className="text-xs h-7" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Descripción</label>
                    <textarea
                      value={cur.description || ""}
                      onChange={(ev) => setEdit(p.id, "description", ev.target.value || null)}
                      rows={2}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="—"
                    />
                  </div>

                  {/* AI fill button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs"
                    disabled={!hasGeminiKey || isAiLoading}
                    onClick={() => fillOneWithAI(p.id, cur.name)}
                  >
                    {isAiLoading
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <Sparkles className="h-3 w-3 mr-1" />}
                    {isAiLoading ? "Generando…" : "✨ Llenar con IA"}
                  </Button>

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
                          toast({ title: "✅ Publicado", description: cur.name });
                          load(0);
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Publicar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => load(page - 1)} disabled={page === 0 || loading}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" onClick={() => load(page + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount || loading}>Siguiente</Button>
        </div>
      )}
    </div>
  );
};

export default ImportedProductsPreviewSection;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Globe, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Domain {
  id: string;
  hostname: string;
  display_name: string | null;
  brand_id: string | null;
  sub_store_id: string | null;
  status: string;
  ssl_status: string;
  is_primary: boolean;
  notes: string | null;
  last_scraped_at: string | null;
}

interface Brand { id: string; name: string; slug: string; }
interface SubStore { id: string; name: string; slug: string; brand_id: string | null; }

const empty = {
  hostname: "",
  display_name: "",
  brand_id: null as string | null,
  sub_store_id: null as string | null,
  status: "pending",
  ssl_status: "pending",
  is_primary: false,
  notes: "",
};

interface Props {
  onImportFromDomain?: (domain: Domain) => void;
}

const DomainsSection = ({ onImportFromDomain }: Props) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subStores, setSubStores] = useState<SubStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, b, s] = await Promise.all([
      (supabase as any).from("domains").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("brands").select("id,name,slug").order("name"),
      (supabase as any).from("sub_stores").select("id,name,slug,brand_id"),
    ]);
    setDomains(d.data ?? []);
    setBrands(b.data ?? []);
    setSubStores(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (d: Domain) => {
    setEditingId(d.id);
    setForm({
      hostname: d.hostname,
      display_name: d.display_name ?? "",
      brand_id: d.brand_id,
      sub_store_id: d.sub_store_id,
      status: d.status,
      ssl_status: d.ssl_status,
      is_primary: d.is_primary,
      notes: d.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.hostname.trim()) { toast.error("Hostname obligatorio"); return; }
    setSaving(true);
    const payload = {
      hostname: form.hostname.trim().toLowerCase(),
      display_name: form.display_name.trim() || null,
      brand_id: form.brand_id,
      sub_store_id: form.sub_store_id,
      status: form.status,
      ssl_status: form.ssl_status,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };
    const op = editingId
      ? (supabase as any).from("domains").update(payload).eq("id", editingId)
      : (supabase as any).from("domains").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Dominio actualizado" : "Dominio agregado");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar dominio?")) return;
    const { error } = await (supabase as any).from("domains").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dominio eliminado");
    load();
  };

  const filteredSubStores = form.brand_id ? subStores.filter((s) => s.brand_id === form.brand_id) : subStores;

  const statusColor = (s: string) =>
    s === "active" ? "bg-green-500/15 text-green-500" :
    s === "verified" ? "bg-blue-500/15 text-blue-500" :
    s === "offline" ? "bg-destructive/15 text-destructive" :
    "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Dominios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registra dominios externos (cannesh.com, neshika.com…) y vincúlalos a marcas y sub-tiendas para scraping y publicación.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nuevo dominio</Button>
      </div>

      {domains.some((d) => d.status !== "active" && d.sub_store_id) && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-600 mb-2">⚠ Direcciones temporales activas</p>
          <p className="text-xs text-muted-foreground mb-2">
            Mientras los dominios externos no se verifican, las sub-tiendas son accesibles vía rutas temporales:
          </p>
          <div className="flex flex-wrap gap-2">
            {domains.filter((d) => d.status !== "active" && d.sub_store_id).map((d) => {
              const sub = subStores.find((s) => s.id === d.sub_store_id);
              if (!sub) return null;
              const tempUrl = `${window.location.origin}/s/${sub.slug}`;
              return (
                <button
                  key={d.id}
                  onClick={() => { navigator.clipboard.writeText(tempUrl); toast.success("Copiado: " + tempUrl); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber-500/30 bg-background hover:bg-amber-500/10 transition"
                >
                  {d.hostname} → <span className="text-primary font-mono">/s/{sub.slug}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : domains.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no hay dominios registrados.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((d) => {
            const brand = brands.find((b) => b.id === d.brand_id);
            const sub = subStores.find((s) => s.id === d.sub_store_id);
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{d.hostname}</h3>
                      <Badge className={statusColor(d.status)} variant="secondary">{d.status}</Badge>
                      {d.is_primary && <Badge variant="outline">Primario</Badge>}
                    </div>
                    {d.display_name && <p className="text-xs text-muted-foreground truncate">{d.display_name}</p>}
                  </div>
                  <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p><span className="text-muted-foreground">Marca:</span> <span className="font-medium">{brand?.name ?? "—"}</span></p>
                  <p><span className="text-muted-foreground">Sub-tienda:</span>{" "}
                    {sub ? (
                      <a href={`/s/${sub.slug}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        /s/{sub.slug}
                      </a>
                    ) : "—"}
                  </p>
                  {d.last_scraped_at && (
                    <p className="text-muted-foreground">Último scrape: {new Date(d.last_scraped_at).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
                  {onImportFromDomain && (
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onImportFromDomain(d)}>
                      <Wand2 className="h-3 w-3" /> Importar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => openEdit(d)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => remove(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar dominio" : "Nuevo dominio"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Hostname *</Label>
              <Input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="cannesh.com" />
            </div>
            <div className="space-y-2">
              <Label>Nombre visible</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Cannesh Store" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={form.brand_id ?? "__none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "__none" ? null : v, sub_store_id: null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Ninguna</SelectItem>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub-tienda</Label>
                <Select value={form.sub_store_id ?? "__none"} onValueChange={(v) => setForm({ ...form, sub_store_id: v === "__none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Ninguna</SelectItem>
                    {filteredSubStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="verified">Verificado</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SSL</Label>
                <Select value={form.ssl_status} onValueChange={(v) => setForm({ ...form, ssl_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
              <Label>Dominio principal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DomainsSection;

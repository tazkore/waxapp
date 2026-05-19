import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Loader2, Tag, GitBranch, ExternalLink,
  Store, Search, ChevronDown, ChevronUp, Info, Package, Globe,
  Star, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageField from './ImageField';
import RemixBrandDialog from './RemixBrandDialog';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const empty = {
  name: '', slug: '', logo_url: null as string | null,
  description: '', website: '', is_featured: false, display_order: 0, is_active: true,
};

const STEPS = [
  { icon: Tag,       text: 'Crea la marca: sube logo, descripción y sitio web.' },
  { icon: Package,   text: 'Asigna productos: en Catálogo → Productos, asocia cada producto a esta marca.' },
  { icon: Globe,     text: 'Aparece en la tienda: en la página /marcas y en el carrusel del Home automáticamente.' },
  { icon: Star,      text: '"Destacada" → resalta la marca con badge especial en la vitrina pública.' },
  { icon: Store,     text: '"Remix" → genera una microtienda independiente en /s/{slug} con colores y branding propios.' },
];

const BrandsSection = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);
  const [remixBrand, setRemixBrand] = useState<Brand | null>(null);
  const [subStores, setSubStores] = useState<Record<string, { id: string; slug: string; name: string }[]>>({});
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [guideOpen, setGuideOpen] = useState(true);

  const loadSubStores = async () => {
    const { data } = await (supabase as any).from('sub_stores').select('id,slug,name,brand_id');
    const grouped: Record<string, any[]> = {};
    (data ?? []).forEach((s: any) => {
      if (!s.brand_id) return;
      grouped[s.brand_id] = grouped[s.brand_id] || [];
      grouped[s.brand_id].push(s);
    });
    setSubStores(grouped);
  };

  const loadProductCounts = async () => {
    const { data } = await supabase
      .from('products')
      .select('brand_id')
      .not('brand_id', 'is', null);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: any) => {
      if (!row.brand_id) return;
      counts[row.brand_id] = (counts[row.brand_id] || 0) + 1;
    });
    setProductCounts(counts);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('brands').select('*').order('display_order').order('name');
    setBrands(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    loadSubStores();
    loadProductCounts();
  }, []);

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (b: Brand) => {
    setEditingId(b.id);
    setForm({
      name: b.name, slug: b.slug, logo_url: b.logo_url,
      description: b.description ?? '', website: b.website ?? '',
      is_featured: b.is_featured, display_order: b.display_order, is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nombre obligatorio'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      logo_url: form.logo_url,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      is_featured: form.is_featured,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    const op = editingId
      ? (supabase as any).from('brands').update(payload).eq('id', editingId)
      : (supabase as any).from('brands').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'Marca actualizada' : 'Marca creada');
    setOpen(false);
    load();
    loadProductCounts();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta marca? Se desvinculará de los productos y sub-tiendas asociados.')) return;
    const { error } = await (supabase as any).from('brands').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marca eliminada');
    load();
  };

  const filtered = brands.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
  });

  const activeCount = brands.filter((b) => b.is_active).length;
  const featuredCount = brands.filter((b) => b.is_featured).length;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" /> Marcas
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs">{brands.length} total</Badge>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">{activeCount} activas</Badge>
            {featuredCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">{featuredCount} destacadas</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/marcas"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver vitrina pública
          </a>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva marca
          </Button>
        </div>
      </div>

      {/* ── Guía de uso ─────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/3">
        <CardContent className="p-4">
          <button
            onClick={() => setGuideOpen((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary flex-shrink-0" />
              ¿Cómo funcionan las Marcas?
            </span>
            {guideOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {guideOpen && (
            <div className="mt-4 space-y-3">
              <ol className="space-y-2.5">
                {STEPS.map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{text}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-3 pt-3 border-t border-border/60 grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <span><strong className="text-foreground">Slug:</strong> ID único en URLs (ej. /s/krt)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span><strong className="text-foreground">Orden:</strong> número menor = aparece primero</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground flex-shrink-0" />
                  <span><strong className="text-foreground">Inactiva:</strong> se oculta de la tienda sin borrar</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Búsqueda ────────────────────────────────────────────── */}
      {brands.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar marca por nombre o slug…"
            className="pl-9"
          />
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : brands.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">Aún no hay marcas</p>
          <p className="text-sm text-muted-foreground mb-4">
            Empieza creando tu primera marca para asignarle productos y mostrarla en la vitrina.
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Crear primera marca
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Sin resultados para "{search}".
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const prodCount = productCounts[b.id] ?? 0;
            const stores = subStores[b.id] ?? [];
            return (
              <Card key={b.id} className={`overflow-hidden transition-all ${!b.is_active ? 'opacity-60' : ''}`}>
                {/* Card header */}
                <div className="p-4 flex items-start gap-3">
                  <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border/60">
                    {b.logo_url
                      ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-1" />
                      : <span className="text-xl font-bold text-muted-foreground/50">{b.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-foreground">{b.name}</h3>
                      {b.is_featured && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-400/15 text-amber-400 border-amber-400/30">
                          ★ Destacada
                        </Badge>
                      )}
                      {!b.is_active && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Inactiva</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">{b.slug}</p>
                    {b.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="px-4 pb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {prodCount > 0
                      ? `${prodCount} producto${prodCount !== 1 ? 's' : ''}`
                      : <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="h-3 w-3" /> Sin productos</span>
                    }
                  </span>
                  {b.website && (
                    <a href={b.website} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors">
                      <Globe className="h-3 w-3" /> Web
                    </a>
                  )}
                  <span className="text-muted-foreground/50">orden: {b.display_order}</span>
                </div>

                {/* Sub-stores */}
                {stores.length > 0 && (
                  <div className="mx-4 mb-3 pt-3 border-t border-border space-y-1">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wider">
                      Sub-tiendas ({stores.length})
                    </p>
                    {stores.map((s) => (
                      <a key={s.id} href={`/s/${s.slug}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> /s/{s.slug}
                      </a>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-1 px-4 pb-4 pt-2 border-t border-border">
                  <Button
                    size="sm" variant="outline"
                    title="Crear sub-tienda con branding propio de esta marca"
                    onClick={() => { setRemixBrand(b); setRemixOpen(true); }}
                    className="h-7 gap-1 text-xs"
                  >
                    <Store className="h-3 w-3" /> Sub-tienda
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="h-7 gap-1 text-xs">
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog crear / editar ────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar marca' : 'Nueva marca'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  placeholder="KRT"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Slug
                  <span className="text-muted-foreground text-xs ml-1">(URL única)</span>
                </Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="krt"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <ImageField
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="brands"
              label="Logo de la marca"
            />

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tagline o descripción breve de la marca…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sitio web</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://marca.com"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Orden de aparición
                  <span className="text-muted-foreground text-xs ml-1">(menor = primero)</span>
                </Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                />
                <div>
                  <Label className="cursor-pointer">Destacada en home</Label>
                  <p className="text-xs text-muted-foreground">Aparece con badge especial en /marcas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <div>
                  <Label className="cursor-pointer">Activa</Label>
                  <p className="text-xs text-muted-foreground">Visible en la tienda</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Guardar cambios' : 'Crear marca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemixBrandDialog
        open={remixOpen}
        onClose={() => setRemixOpen(false)}
        brand={remixBrand}
        onCreated={loadSubStores}
      />
    </div>
  );
};

export default BrandsSection;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GripVertical, Plus, Trash2, Loader2, Save, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  menu_id: string;
  label: string;
  url: string;
  display_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

interface Menu {
  id: string;
  slug: string;
  name: string;
  location: string;
}

const SortableRow = ({ item, onChange, onDelete }: {
  item: MenuItem;
  onChange: (patch: Partial<MenuItem>) => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Texto"
        className="flex-1 min-w-0"
      />
      <Input
        value={item.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="/ruta o https://..."
        className="flex-[2] min-w-0 font-mono text-xs"
      />
      <div className="flex items-center gap-1.5 px-2" title="Abrir en nueva pestaña">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        <Switch checked={item.open_in_new_tab} onCheckedChange={(v) => onChange({ open_in_new_tab: v })} />
      </div>
      <Switch checked={item.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
      <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive shrink-0">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const ThemeMenusSection = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: m } = await supabase.from('nav_menus').select('*').order('name');
    const { data: i } = await supabase.from('nav_menu_items').select('*').order('display_order');
    setMenus(m ?? []);
    const grouped: Record<string, MenuItem[]> = {};
    (m ?? []).forEach((mn) => {
      grouped[mn.id] = (i ?? []).filter((it) => it.menu_id === mn.id);
    });
    setItems(grouped);
    setLoading(false);
  };

  const handleDragEnd = (menuId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = items[menuId];
    const oldIdx = list.findIndex((i) => i.id === active.id);
    const newIdx = list.findIndex((i) => i.id === over.id);
    const next = arrayMove(list, oldIdx, newIdx).map((it, idx) => ({ ...it, display_order: idx }));
    setItems({ ...items, [menuId]: next });
  };

  const updateItem = (menuId: string, itemId: string, patch: Partial<MenuItem>) => {
    setItems({
      ...items,
      [menuId]: items[menuId].map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    });
  };

  const addItem = async (menuId: string) => {
    const order = (items[menuId]?.length ?? 0);
    const { data, error } = await supabase
      .from('nav_menu_items')
      .insert({ menu_id: menuId, label: 'Nuevo enlace', url: '/', display_order: order, is_active: true })
      .select()
      .single();
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setItems({ ...items, [menuId]: [...(items[menuId] ?? []), data as MenuItem] });
  };

  const removeItem = async (menuId: string, itemId: string) => {
    const { error } = await supabase.from('nav_menu_items').delete().eq('id', itemId);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setItems({ ...items, [menuId]: items[menuId].filter((i) => i.id !== itemId) });
  };

  const saveMenu = async (menuId: string) => {
    setSaving(true);
    try {
      const list = items[menuId];
      // Bulk update via individual upserts (small lists)
      await Promise.all(
        list.map((it) =>
          supabase.from('nav_menu_items').update({
            label: it.label,
            url: it.url,
            display_order: it.display_order,
            is_active: it.is_active,
            open_in_new_tab: it.open_in_new_tab,
          }).eq('id', it.id)
        )
      );
      toast({ title: '✅ Menú guardado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (menus.length === 0) return <p className="text-muted-foreground">No hay menús configurados.</p>;

  return (
    <Tabs defaultValue={menus[0]?.id} className="space-y-4">
      <TabsList>
        {menus.map((m) => (
          <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
        ))}
      </TabsList>

      {menus.map((m) => (
        <TabsContent key={m.id} value={m.id}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{m.name}</h3>
                  <p className="text-xs text-muted-foreground">Arrastra para reordenar. Slug: <code>{m.slug}</code></p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addItem(m.id)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                  <Button size="sm" onClick={() => saveMenu(m.id)} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                  </Button>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(m.id)}>
                <SortableContext items={(items[m.id] ?? []).map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {(items[m.id] ?? []).map((it) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        onChange={(patch) => updateItem(m.id, it.id, patch)}
                        onDelete={() => removeItem(m.id, it.id)}
                      />
                    ))}
                    {items[m.id]?.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-6">
                        Sin enlaces. Agrega el primero.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ThemeMenusSection;

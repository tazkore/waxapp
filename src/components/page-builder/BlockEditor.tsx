import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { type PageBlock, type BlockType, BLOCK_LABELS, newBlock } from './blockTypes';
import BlockRenderer from './BlockRenderer';

interface Props {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
}

const BlockEditor = ({ blocks, onChange }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  const addBlock = (type: BlockType) => {
    const block = newBlock(type);
    onChange([...blocks, block]);
    setOpenId(block.id);
  };

  const updateBlock = (id: string, data: Record<string, any>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b)));
  };

  const removeBlock = (id: string) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    onChange(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Bloques de contenido</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Añadir bloque</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            <div className="grid gap-1 max-h-80 overflow-y-auto">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className="flex items-start gap-3 p-2 rounded hover:bg-accent text-left"
                >
                  <span className="text-2xl">{BLOCK_LABELS[t].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground text-sm">{BLOCK_LABELS[t].label}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{BLOCK_LABELS[t].desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {blocks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <p className="text-sm">No hay bloques. Haz clic en "Añadir bloque" para empezar.</p>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  isOpen={openId === b.id}
                  isPreview={previewId === b.id}
                  onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                  onTogglePreview={() => setPreviewId(previewId === b.id ? null : b.id)}
                  onUpdate={(data) => updateBlock(b.id, data)}
                  onRemove={() => removeBlock(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

interface SortableProps {
  block: PageBlock;
  isOpen: boolean;
  isPreview: boolean;
  onToggle: () => void;
  onTogglePreview: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onRemove: () => void;
}

const SortableBlock = ({ block, isOpen, isPreview, onToggle, onTogglePreview, onUpdate, onRemove }: SortableProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const meta = BLOCK_LABELS[block.type];

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-muted/30">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="text-xl">{meta.icon}</span>
        <span className="font-medium text-foreground flex-1">{meta.label}</span>
        <Button size="icon" variant="ghost" onClick={onTogglePreview} title="Vista previa">
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onToggle}>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onRemove} className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isPreview && (
        <div className="border-t border-border bg-background">
          <BlockRenderer block={block} />
        </div>
      )}

      {isOpen && (
        <div className="border-t border-border p-4 space-y-3">
          <BlockFields block={block} onUpdate={onUpdate} />
        </div>
      )}
    </Card>
  );
};

const BlockFields = ({ block, onUpdate }: { block: PageBlock; onUpdate: (d: Record<string, any>) => void }) => {
  const d = block.data;

  switch (block.type) {
    case 'hero':
      return (
        <>
          <Field label="Título"><Input value={d.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={d.subtitle ?? ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto del botón"><Input value={d.ctaText ?? ''} onChange={(e) => onUpdate({ ctaText: e.target.value })} /></Field>
            <Field label="URL del botón"><Input value={d.ctaUrl ?? ''} onChange={(e) => onUpdate({ ctaUrl: e.target.value })} /></Field>
          </div>
          <Field label="Imagen de fondo (URL)"><Input value={d.imageUrl ?? ''} onChange={(e) => onUpdate({ imageUrl: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Alineación">
            <Select value={d.align ?? 'center'} onValueChange={(v) => onUpdate({ align: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case 'text':
      return (
        <>
          <Field label="Contenido"><Textarea value={d.content ?? ''} onChange={(e) => onUpdate({ content: e.target.value })} className="min-h-[120px]" /></Field>
          <Field label="Alineación">
            <Select value={d.align ?? 'left'} onValueChange={(v) => onUpdate({ align: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
                <SelectItem value="justify">Justificado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case 'image':
      return (
        <>
          <Field label="URL de la imagen"><Input value={d.url ?? ''} onChange={(e) => onUpdate({ url: e.target.value })} /></Field>
          <Field label="Texto alternativo (alt)"><Input value={d.alt ?? ''} onChange={(e) => onUpdate({ alt: e.target.value })} /></Field>
          <Field label="Caption"><Input value={d.caption ?? ''} onChange={(e) => onUpdate({ caption: e.target.value })} /></Field>
          <Field label="Ancho">
            <Select value={d.width ?? 'full'} onValueChange={(v) => onUpdate({ width: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medium">Mediano</SelectItem>
                <SelectItem value="wide">Ancho</SelectItem>
                <SelectItem value="full">Completo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case 'productGrid':
      return (
        <>
          <Field label="Título"><Input value={d.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} /></Field>
          <Field label="Categoría (opcional, exacta)"><Input value={d.category ?? ''} onChange={(e) => onUpdate({ category: e.target.value })} placeholder="cbd, edibles..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad"><Input type="number" min={1} max={24} value={d.limit ?? 8} onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 8 })} /></Field>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={!!d.onlyFeatured} onCheckedChange={(v) => onUpdate({ onlyFeatured: v })} />
              <Label>Solo destacados</Label>
            </div>
          </div>
        </>
      );
    case 'banner':
      return (
        <>
          <Field label="Título"><Input value={d.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={d.subtitle ?? ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color de fondo"><Input value={d.bgColor ?? ''} onChange={(e) => onUpdate({ bgColor: e.target.value })} placeholder="hsl(var(--primary))" /></Field>
            <Field label="Color de texto"><Input value={d.textColor ?? ''} onChange={(e) => onUpdate({ textColor: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto botón"><Input value={d.ctaText ?? ''} onChange={(e) => onUpdate({ ctaText: e.target.value })} /></Field>
            <Field label="URL botón"><Input value={d.ctaUrl ?? ''} onChange={(e) => onUpdate({ ctaUrl: e.target.value })} /></Field>
          </div>
        </>
      );
    case 'faq':
      return (
        <>
          <Field label="Título"><Input value={d.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} /></Field>
          <div className="space-y-2">
            <Label>Preguntas</Label>
            {(d.items ?? []).map((it: any, i: number) => (
              <div key={i} className="border border-border rounded p-2 space-y-2">
                <Input
                  placeholder="Pregunta"
                  value={it.q}
                  onChange={(e) => {
                    const items = [...d.items];
                    items[i] = { ...items[i], q: e.target.value };
                    onUpdate({ items });
                  }}
                />
                <Textarea
                  placeholder="Respuesta"
                  value={it.a}
                  onChange={(e) => {
                    const items = [...d.items];
                    items[i] = { ...items[i], a: e.target.value };
                    onUpdate({ items });
                  }}
                />
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onUpdate({ items: d.items.filter((_: any, idx: number) => idx !== i) })}>
                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => onUpdate({ items: [...(d.items ?? []), { q: '', a: '' }] })}>
              <Plus className="h-3 w-3 mr-1" /> Añadir pregunta
            </Button>
          </div>
        </>
      );
    case 'cta':
      return (
        <>
          <Field label="Título"><Input value={d.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={d.subtitle ?? ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto botón"><Input value={d.ctaText ?? ''} onChange={(e) => onUpdate({ ctaText: e.target.value })} /></Field>
            <Field label="URL botón"><Input value={d.ctaUrl ?? ''} onChange={(e) => onUpdate({ ctaUrl: e.target.value })} /></Field>
          </div>
        </>
      );
    case 'columns':
      return (
        <div className="space-y-2">
          <Label>Columnas ({d.columns?.length ?? 0})</Label>
          {(d.columns ?? []).map((c: any, i: number) => (
            <div key={i} className="border border-border rounded p-2 space-y-2">
              <Input
                placeholder="Título"
                value={c.title}
                onChange={(e) => {
                  const columns = [...d.columns];
                  columns[i] = { ...columns[i], title: e.target.value };
                  onUpdate({ columns });
                }}
              />
              <Textarea
                placeholder="Texto"
                value={c.text}
                onChange={(e) => {
                  const columns = [...d.columns];
                  columns[i] = { ...columns[i], text: e.target.value };
                  onUpdate({ columns });
                }}
              />
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onUpdate({ columns: d.columns.filter((_: any, idx: number) => idx !== i) })}>
                <Trash2 className="h-3 w-3 mr-1" /> Eliminar columna
              </Button>
            </div>
          ))}
          {(d.columns?.length ?? 0) < 4 && (
            <Button size="sm" variant="outline" onClick={() => onUpdate({ columns: [...(d.columns ?? []), { title: '', text: '' }] })}>
              <Plus className="h-3 w-3 mr-1" /> Añadir columna
            </Button>
          )}
        </div>
      );
    case 'spacer':
      return (
        <Field label="Tamaño">
          <Select value={d.size ?? 'md'} onValueChange={(v) => onUpdate({ size: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeño</SelectItem>
              <SelectItem value="md">Mediano</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="xl">Extra grande</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      );
    case 'video':
      return (
        <>
          <Field label="URL del video (YouTube/Vimeo)"><Input value={d.url ?? ''} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></Field>
          <Field label="Caption"><Input value={d.caption ?? ''} onChange={(e) => onUpdate({ caption: e.target.value })} /></Field>
        </>
      );
    default:
      return null;
  }
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

export default BlockEditor;

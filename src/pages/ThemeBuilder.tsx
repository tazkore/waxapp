import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Type, Image as ImageIcon, Layout, Trash2, GripVertical, MoveUp, MoveDown,
  Save, Eye, ChevronLeft, Undo2, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// ─── Block Types ──────────────────────────────────────────────────────
type BlockType = "hero" | "text" | "image";

interface BaseBlock { id: string; type: BlockType }

interface HeroBlock extends BaseBlock {
  type: "hero";
  title: string;
  subtitle: string;
  cta: string;
  ctaUrl: string;
  bgColor: string;
}

interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
  align: "left" | "center" | "right";
  size: "sm" | "base" | "lg" | "xl";
}

interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt: string;
  caption: string;
  fullWidth: boolean;
}

type Block = HeroBlock | TextBlock | ImageBlock;

// ─── Default blocks ───────────────────────────────────────────────────
const defaultBlocks: Block[] = [
  {
    id: "hero-1", type: "hero",
    title: "Bienestar con nanotecnología", subtitle: "Productos premium CBD & THC con máxima biodisponibilidad.",
    cta: "Ver catálogo", ctaUrl: "/#tienda", bgColor: "#0a0a0a",
  },
  {
    id: "text-1", type: "text",
    content: "WAXAPP es la tienda líder de cannabis wellness en México. Calidad certificada, entrega rápida y total discreción.",
    align: "center", size: "lg",
  },
];

let idCounter = 100;
const uid = (prefix: string) => `${prefix}-${++idCounter}`;

// ─── Block Components (preview) ───────────────────────────────────────
const HeroPreview = ({ block }: { block: HeroBlock }) => (
  <div className="relative w-full py-16 px-8 text-center rounded-lg overflow-hidden" style={{ backgroundColor: block.bgColor }}>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
    <div className="relative z-10">
      <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>{block.title || "Título"}</h1>
      <p className="text-white/80 mb-6">{block.subtitle || "Subtítulo"}</p>
      <a href={block.ctaUrl} className="inline-block bg-green-400 text-black px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-300 transition-colors">
        {block.cta || "Botón"}
      </a>
    </div>
  </div>
);

const TextPreview = ({ block }: { block: TextBlock }) => {
  const sizes = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };
  return (
    <div className={`${sizes[block.size]} text-foreground`} style={{ textAlign: block.align }}>
      {block.content || "Texto aquí..."}
    </div>
  );
};

const ImagePreview = ({ block }: { block: ImageBlock }) => (
  <div className={block.fullWidth ? "w-full" : "max-w-md mx-auto"}>
    {block.src
      ? <img src={block.src} alt={block.alt} className="w-full rounded-lg object-cover" style={{ maxHeight: 360 }} />
      : <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-12 w-12" />
        </div>
    }
    {block.caption && <p className="text-xs text-muted-foreground text-center mt-2">{block.caption}</p>}
  </div>
);

// ─── Block Editor (properties panel) ─────────────────────────────────
const BlockEditor = ({ block, onChange }: { block: Block; onChange: (b: Block) => void }) => {
  if (block.type === "hero") {
    const b = block as HeroBlock;
    return (
      <div className="space-y-3">
        <div><Label className="text-xs">Título</Label>
          <Input value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} /></div>
        <div><Label className="text-xs">Subtítulo</Label>
          <Input value={b.subtitle} onChange={(e) => onChange({ ...b, subtitle: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Texto del botón</Label>
            <Input value={b.cta} onChange={(e) => onChange({ ...b, cta: e.target.value })} /></div>
          <div><Label className="text-xs">URL del botón</Label>
            <Input value={b.ctaUrl} onChange={(e) => onChange({ ...b, ctaUrl: e.target.value })} /></div>
        </div>
        <div><Label className="text-xs">Color de fondo</Label>
          <div className="flex gap-2">
            <input type="color" value={b.bgColor} onChange={(e) => onChange({ ...b, bgColor: e.target.value })}
              className="h-9 w-12 rounded border border-input cursor-pointer" />
            <Input value={b.bgColor} onChange={(e) => onChange({ ...b, bgColor: e.target.value })} className="font-mono" />
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "text") {
    const b = block as TextBlock;
    return (
      <div className="space-y-3">
        <div><Label className="text-xs">Contenido</Label>
          <Textarea value={b.content} onChange={(e) => onChange({ ...b, content: e.target.value })} rows={4} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Alineación</Label>
            <select value={b.align} onChange={(e) => onChange({ ...b, align: e.target.value as any })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </div>
          <div><Label className="text-xs">Tamaño</Label>
            <select value={b.size} onChange={(e) => onChange({ ...b, size: e.target.value as any })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="sm">Pequeño</option>
              <option value="base">Normal</option>
              <option value="lg">Grande</option>
              <option value="xl">Extra grande</option>
            </select>
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "image") {
    const b = block as ImageBlock;
    return (
      <div className="space-y-3">
        <div><Label className="text-xs">URL de imagen</Label>
          <Input value={b.src} onChange={(e) => onChange({ ...b, src: e.target.value })} placeholder="https://…" /></div>
        <div><Label className="text-xs">Texto alternativo</Label>
          <Input value={b.alt} onChange={(e) => onChange({ ...b, alt: e.target.value })} /></div>
        <div><Label className="text-xs">Pie de imagen</Label>
          <Input value={b.caption} onChange={(e) => onChange({ ...b, caption: e.target.value })} /></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="fw" checked={b.fullWidth} onChange={(e) => onChange({ ...b, fullWidth: e.target.checked })} />
          <Label htmlFor="fw" className="text-xs cursor-pointer">Ancho completo</Label>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Main ThemeBuilder page ───────────────────────────────────────────
const ThemeBuilder = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [selected, setSelected] = useState<string | null>(blocks[0]?.id ?? null);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<Block[][]>([defaultBlocks]);

  const selectedBlock = blocks.find((b) => b.id === selected) ?? null;

  const pushHistory = (newBlocks: Block[]) => {
    setHistory((h) => [...h.slice(-19), newBlocks]);
    setBlocks(newBlocks);
  };

  const undo = () => {
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    setHistory((h) => h.slice(0, -1));
    setBlocks(prev);
  };

  const updateBlock = (updated: Block) => {
    pushHistory(blocks.map((b) => (b.id === updated.id ? updated : b)));
  };

  const addBlock = (type: BlockType) => {
    let newBlock: Block;
    if (type === "hero") newBlock = { id: uid("hero"), type: "hero", title: "Nuevo Hero", subtitle: "", cta: "Ver más", ctaUrl: "/", bgColor: "#111111" };
    else if (type === "text") newBlock = { id: uid("text"), type: "text", content: "Nuevo texto aquí.", align: "left", size: "base" };
    else newBlock = { id: uid("img"), type: "image", src: "", alt: "", caption: "", fullWidth: false };
    const next = [...blocks, newBlock];
    pushHistory(next);
    setSelected(newBlock.id);
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    pushHistory(next);
    setSelected(next[0]?.id ?? null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const arr = Array.from(blocks);
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    pushHistory(arr);
  };

  const handleSave = () => {
    const json = JSON.stringify(blocks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "waxapp-theme.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Diseño exportado como JSON");
  };

  const blockLabel = (type: BlockType) =>
    type === "hero" ? "Hero" : type === "text" ? "Texto" : "Imagen";

  const blockIcon = (type: BlockType) =>
    type === "hero" ? Layout : type === "text" ? Type : ImageIcon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-background/95 sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-sm tracking-wide">Theme Builder</span>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">BETA</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={history.length < 2}>
            <Undo2 className="h-4 w-4 mr-1" /> Deshacer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
            <Eye className="h-4 w-4 mr-1" /> {preview ? "Editar" : "Vista previa"}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* Left panel: block list */}
        {!preview && (
          <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border flex flex-col bg-card/50 shrink-0">
            <div className="p-3 border-b border-border/60">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Agregar bloque</p>
              <div className="flex flex-col gap-1.5">
                {(["hero", "text", "image"] as BlockType[]).map((t) => {
                  const Icon = blockIcon(t);
                  return (
                    <Button key={t} variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs" onClick={() => addBlock(t)}>
                      <Plus className="h-3 w-3" /><Icon className="h-3.5 w-3.5" /> {blockLabel(t)}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">Estructura</p>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                      {blocks.map((block, idx) => {
                        const Icon = blockIcon(block.type);
                        return (
                          <Draggable key={block.id} draggableId={block.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-xs transition-colors group
                                  ${selected === block.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"}
                                  ${snap.isDragging ? "shadow-lg bg-card" : ""}`}
                                onClick={() => setSelected(block.id)}
                              >
                                <span {...prov.dragHandleProps} className="cursor-grab text-muted-foreground/40">
                                  <GripVertical className="h-3.5 w-3.5" />
                                </span>
                                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="flex-1 truncate">{blockLabel(block.type)}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </aside>
        )}

        {/* Center: canvas */}
        <main className={`flex-1 overflow-y-auto p-6 bg-muted/20 ${preview ? "p-0" : ""}`}>
          <div className={`mx-auto ${preview ? "max-w-none space-y-0" : "max-w-3xl space-y-4"}`}>
            {blocks.length === 0 && (
              <div className="py-24 text-center text-muted-foreground">
                <Layout className="h-12 w-12 mx-auto mb-4 text-primary/30" />
                <p>Agrega bloques desde el panel izquierdo para construir tu página.</p>
              </div>
            )}
            {blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => !preview && setSelected(block.id)}
                className={`relative transition-all ${
                  !preview
                    ? `cursor-pointer rounded-lg p-4 border-2 ${
                        selected === block.id ? "border-primary ring-2 ring-primary/20" : "border-dashed border-border/50 hover:border-border"
                      }`
                    : ""
                }`}
              >
                {!preview && selected === block.id && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Badge variant="outline" className="text-[9px] border-primary/40 text-primary bg-background">
                      {blockLabel(block.type)}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {block.type === "hero" && <HeroPreview block={block as HeroBlock} />}
                {block.type === "text" && <TextPreview block={block as TextBlock} />}
                {block.type === "image" && <ImagePreview block={block as ImageBlock} />}
              </div>
            ))}
          </div>
        </main>

        {/* Right panel: properties */}
        {!preview && selectedBlock && (
          <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border bg-card/50 overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                {(() => { const Icon = blockIcon(selectedBlock.type); return <Icon className="h-4 w-4 text-primary" />; })()}
                <p className="text-sm font-semibold capitalize">{blockLabel(selectedBlock.type)}</p>
              </div>
              <BlockEditor block={selectedBlock} onChange={updateBlock} />
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button variant="destructive" size="sm" className="w-full gap-2" onClick={() => removeBlock(selectedBlock.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar bloque
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ThemeBuilder;

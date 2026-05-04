import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles,
  ImageOff,
  Search,
  Loader2,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { validateProductRow } from "@/lib/validateProductRow";

export interface StagingRowAction {
  selected: boolean;
  imageBusy: boolean;
  aiBusy: boolean;
}

interface Props {
  products: any[];
  selectedIdx: Set<number>;
  rowImageBusy: Set<number>;
  rowAiBusy: Set<number>;
  onToggle: (i: number, v: boolean) => void;
  onToggleAll: (v: boolean) => void;
  onAutoImage: (i: number) => void;
  onPickImage: (i: number) => void;
  onEnrich: (i: number) => void;
  onRemove: (i: number) => void;
}

const SeoBadge = ({ row }: { row: any }) => {
  const v = validateProductRow(row);
  const seoFields = ["meta_title", "meta_description", "focus_keyword"];
  const seoErrors = v.errors.filter((e) => seoFields.includes(e.field));
  const seoWarnings = v.warnings.filter((w) => seoFields.includes(w.field));

  if (seoErrors.length > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive bg-destructive/10">
        <XCircle className="h-3 w-3" /> Faltante
      </Badge>
    );
  }
  if (seoWarnings.length > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400/50 text-amber-400 bg-amber-400/10">
        <AlertTriangle className="h-3 w-3" /> Incompleto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-primary/50 text-primary bg-primary/10">
      <CheckCircle2 className="h-3 w-3" /> Optimizado
    </Badge>
  );
};

const StagingTable = ({
  products,
  selectedIdx,
  rowImageBusy,
  rowAiBusy,
  onToggle,
  onToggleAll,
  onAutoImage,
  onPickImage,
  onEnrich,
  onRemove,
}: Props) => {
  const allSelected = products.length > 0 && selectedIdx.size === products.length;

  return (
    <div className="rounded-lg border border-white/5 bg-[hsl(var(--card))] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-white/5">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onToggleAll(!!v)}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead className="w-[72px]">Foto</TableHead>
            <TableHead>Nombre original</TableHead>
            <TableHead className="w-28">Precio</TableHead>
            <TableHead className="w-32">SEO</TableHead>
            <TableHead className="w-[260px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((it, i) => {
            const img = Array.isArray(it.images) ? it.images[0] : it.image_url;
            const v = validateProductRow(it);
            const sel = selectedIdx.has(i);
            const priceMissing = v.errors.some((e) => e.field === "price");

            return (
              <TableRow
                key={i}
                className={`border-white/5 ${sel ? "bg-primary/5" : ""}`}
              >
                <TableCell>
                  <Checkbox checked={sel} onCheckedChange={(v) => onToggle(i, !!v)} />
                </TableCell>

                {/* Photo */}
                <TableCell>
                  <div className="relative h-14 w-14 rounded-md overflow-hidden border border-white/5 bg-muted/40 group">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onPickImage(i)}
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-primary font-medium gap-1 transition-opacity"
                      title="Buscador IA de imágenes"
                    >
                      <Search className="h-3 w-3" /> Buscador IA
                    </button>
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug" title={it.name}>
                      {it.name || <span className="italic text-destructive">Sin nombre</span>}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        v.completeness >= 80 ? "bg-primary" : v.completeness >= 50 ? "bg-amber-400" : "bg-destructive"
                      }`} />
                      {v.completeness}% completo
                      {it.category && <span>· {it.category}</span>}
                      {(it.brand || it.brand_name) && <span>· {it.brand || it.brand_name}</span>}
                      {it.source_url && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={it.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate max-w-[180px] text-muted-foreground/70 hover:text-primary"
                              >
                                · {new URL(it.source_url).hostname}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {it.source_url}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Price */}
                <TableCell>
                  {priceMissing ? (
                    <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">
                      Sin precio
                    </Badge>
                  ) : (
                    <span className="font-mono text-sm">${it.price}</span>
                  )}
                </TableCell>

                {/* SEO */}
                <TableCell>
                  <SeoBadge row={it} />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEnrich(i)}
                      disabled={rowAiBusy.has(i)}
                      className="h-8 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      title="Enriquecer con IA y editar"
                    >
                      {rowAiBusy.has(i) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      IA
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAutoImage(i)}
                      disabled={rowImageBusy.has(i)}
                      className="h-8 gap-1"
                      title="Buscar imagen automáticamente"
                    >
                      {rowImageBusy.has(i) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEnrich(i)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(i)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Quitar de staging"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default StagingTable;

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Progress not used directly — visual bar uses inline divs for color flexibility
import { AlertCircle, ImageOff, Sparkles, ImageIcon, CheckCircle2, Loader2, Lightbulb, X, Tag, Building2 } from "lucide-react";
import { validateProductRow, type FieldIssue } from "@/lib/validateProductRow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { suggestCategoryAndBrand, hasSuggestion, type CatalogEntry } from "@/lib/categoryBrandSuggester";
import { useMemo, useState } from "react";

interface Props {
  item: any;
  index: number;
  selected?: boolean;
  onToggle?: (v: boolean) => void;
  onAutoImage?: () => void;
  onAutoFillAi?: () => void;
  onPickImage?: () => void;
  /** Apply a partial update to this row (e.g. {category, brand}) */
  onApplyPatch?: (patch: Record<string, any>) => void;
  imageBusy?: boolean;
  aiBusy?: boolean;
  /** Catalogs for suggestion fuzzy-match */
  brandCatalog?: CatalogEntry[];
  categoryCatalog?: CatalogEntry[];
}

const colorForScore = (n: number) =>
  n >= 80 ? "text-primary" : n >= 50 ? "text-amber-400" : "text-destructive";
const barForScore = (n: number) =>
  n >= 80 ? "bg-primary" : n >= 50 ? "bg-amber-400" : "bg-destructive";

const IssueChip = ({ issue }: { issue: FieldIssue }) => {
  const cls =
    issue.severity === "error"
      ? "border-destructive/50 text-destructive bg-destructive/10"
      : "border-amber-400/40 text-amber-400 bg-amber-400/10";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-[10px] font-normal cursor-help ${cls}`}>
            {issue.field === "image_url" ? "Sin imagen" :
             issue.field === "price" ? (issue.severity === "error" ? "Sin precio" : "Precio?") :
             issue.field === "description" ? "Sin descripción" :
             issue.field === "category" ? "Sin categoría" :
             issue.field === "brand" ? "Sin marca" :
             issue.field === "meta_title" ? "Meta título" :
             issue.field === "meta_description" ? "Meta desc." :
             issue.field === "focus_keyword" ? "Sin keyword" :
             issue.field === "attributes" ? "Sin atributos" :
             issue.field}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[260px]">
          {issue.message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ProductPreviewCard = ({
  item: it,
  index,
  selected,
  onToggle,
  onAutoImage,
  onAutoFillAi,
  onPickImage,
  onApplyPatch,
  imageBusy,
  aiBusy,
  brandCatalog,
  categoryCatalog,
}: Props) => {
  const validation = validateProductRow(it);
  const img = Array.isArray(it.images) ? it.images[0] : it.image_url;
  const hasErrors = validation.errors.length > 0;
  const allIssues = [...validation.errors, ...validation.warnings];
  const needsImage = allIssues.some((i) => i.field === "image_url");
  const needsAi = allIssues.some((i) => i.action === "ai");

  const [dismissed, setDismissed] = useState(false);
  const suggestion = useMemo(
    () =>
      suggestCategoryAndBrand(
        {
          name: it.name,
          gtin: it.gtin,
          description: it.description,
          source_url: it.source_url,
          current_category: it.category,
          current_brand: it.brand || it.brand_name,
        },
        { brands: brandCatalog, categories: categoryCatalog }
      ),
    [it.name, it.gtin, it.description, it.source_url, it.category, it.brand, it.brand_name, brandCatalog, categoryCatalog]
  );
  const showSuggestion = !dismissed && onApplyPatch && hasSuggestion(suggestion);

  const applySuggestion = () => {
    if (!onApplyPatch) return;
    const patch: Record<string, any> = {};
    if (suggestion.category) patch.category = suggestion.category;
    if (suggestion.brand) {
      patch.brand = suggestion.brand;
      patch.brand_name = suggestion.brand;
    }
    onApplyPatch(patch);
  };

  return (
    <div
      className={`group relative flex gap-3 p-3 rounded-lg border transition-colors ${
        hasErrors
          ? "border-destructive/40 bg-destructive/5"
          : "border-border/50 bg-card/40 hover:border-primary/30"
      }`}
    >
      {onToggle && (
        <Checkbox
          checked={!!selected}
          onCheckedChange={(v) => onToggle(!!v)}
          className="mt-1 shrink-0"
        />
      )}

      {/* Thumbnail */}
      <div className="shrink-0 relative">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            className="h-16 w-16 rounded object-cover bg-muted border border-border/40"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-16 w-16 rounded bg-muted/40 border border-dashed border-border/60 flex items-center justify-center">
            <ImageOff className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug" title={it.name}>
            {it.name || <span className="italic text-destructive">Sin nombre</span>}
          </p>
          <div className={`text-xs font-semibold shrink-0 ${colorForScore(validation.completeness)}`}>
            {validation.completeness}%
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground truncate">
          {it.price != null && it.price !== "" ? `$${it.price}` : <span className="text-destructive">Sin precio</span>}
          {it.category && ` · ${it.category}`}
          {(it.brand || it.brand_name) && ` · ${it.brand || it.brand_name}`}
        </p>

        {/* Completeness bar */}
        <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full transition-all ${barForScore(validation.completeness)}`}
            style={{ width: `${validation.completeness}%` }}
          />
        </div>

        {/* Status / issues */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {allIssues.length === 0 ? (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Listo para importar
            </Badge>
          ) : (
            allIssues.slice(0, 6).map((iss, k) => <IssueChip key={k} issue={iss} />)
          )}
          {allIssues.length > 6 && (
            <Badge variant="outline" className="text-[10px]">+{allIssues.length - 6}</Badge>
          )}
        </div>

        {/* Quick actions */}
        {(onAutoImage || onAutoFillAi || onPickImage) && (needsImage || needsAi) && (
          <div className="flex gap-1.5 pt-1.5 flex-wrap">
            {needsImage && onAutoImage && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAutoImage}
                disabled={imageBusy}
                className="h-7 text-[11px] gap-1 border-amber-400/30 hover:border-amber-400 hover:text-amber-400"
              >
                {imageBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Auto-imagen
              </Button>
            )}
            {needsImage && onPickImage && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPickImage}
                className="h-7 text-[11px] gap-1"
              >
                <ImageIcon className="h-3 w-3" /> Elegir
              </Button>
            )}
            {needsAi && onAutoFillAi && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAutoFillAi}
                disabled={aiBusy}
                className="h-7 text-[11px] gap-1 border-primary/30 hover:border-primary hover:text-primary"
              >
                {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Completar IA
              </Button>
            )}
          </div>
        )}

        {hasErrors && (
          <div className="flex items-start gap-1 pt-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Bloquea la importación. Corrige los campos marcados.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPreviewCard;

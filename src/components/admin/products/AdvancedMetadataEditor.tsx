import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Wand2, FileCheck2 } from "lucide-react";
import { useState } from "react";
import {
  METADATA_TEMPLATES,
  STRAIN_TYPES,
  VAPORIZER_TYPES,
  getTemplate,
  suggestTemplate,
  type MetadataField,
} from "@/lib/metadataTemplates";

export type AdvancedMetadata = {
  metadata_template?: string | null;
  specifications?: Array<{ key: string; value: string; unit?: string }>;
  warnings?: string[];
  ingredients?: string[];
  flavor_profile?: string[];
  country_of_origin?: string | null;
  material?: string | null;
  battery_mah?: number | null;
  puffs_estimate?: number | null;
  nicotine_mg?: number | null;
  vaporizer_type?: string | null;
  thc_percentage?: number | null;
  cbd_percentage?: number | null;
  strain_type?: string | null;
  terpenes?: string[];
  capacity_ml?: number | null;
  pg_vg_ratio?: string | null;
  compatibility?: string[];
  warranty_months?: number | null;
};

const TagInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border border-input bg-background p-2">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 pr-1">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="rounded hover:bg-muted-foreground/20 p-0.5"
              aria-label={`Quitar ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder || "Escribe y Enter…"}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
};

const NumberField = ({
  label,
  value,
  onChange,
  unit,
  step,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  unit?: string;
  step?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">
      {label} {unit && <span className="opacity-70">({unit})</span>}
    </Label>
    <Input
      type="number"
      step={step || "any"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  </div>
);

const SpecsEditor = ({
  value,
  onChange,
}: {
  value: AdvancedMetadata["specifications"];
  onChange: (v: AdvancedMetadata["specifications"]) => void;
}) => {
  const list = value || [];
  const update = (idx: number, patch: Partial<{ key: string; value: string; unit: string }>) => {
    onChange(list.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };
  return (
    <div className="space-y-2">
      {list.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin especificaciones aún. Agrega filas tipo "Voltaje · 3.7 · V".
        </p>
      )}
      {list.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <Input
            className="col-span-4"
            placeholder="Atributo"
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <Input
            className="col-span-5"
            placeholder="Valor"
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <Input
            className="col-span-2"
            placeholder="Unidad"
            value={row.unit || ""}
            onChange={(e) => update(i, { unit: e.target.value })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="col-span-1"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => onChange([...(list || []), { key: "", value: "", unit: "" }])}
      >
        <Plus className="h-3 w-3" /> Añadir fila
      </Button>
    </div>
  );
};

interface Props {
  value: AdvancedMetadata;
  onChange: (v: AdvancedMetadata) => void;
  /** Para sugerir plantilla automáticamente */
  hint?: { name?: string; category?: string };
}

const AdvancedMetadataEditor = ({ value, onChange, hint }: Props) => {
  const v = value || {};
  const set = <K extends keyof AdvancedMetadata>(k: K, val: AdvancedMetadata[K]) =>
    onChange({ ...v, [k]: val });

  const template = useMemo(() => getTemplate(v.metadata_template), [v.metadata_template]);
  const fields: Set<MetadataField> = useMemo(
    () => new Set(template?.fields || []),
    [template]
  );

  const applyTemplate = (slug: string, mergeWarnings = true) => {
    const t = METADATA_TEMPLATES.find((x) => x.slug === slug);
    if (!t) return;
    const next: AdvancedMetadata = { ...v, metadata_template: slug };
    if (mergeWarnings && (!v.warnings || v.warnings.length === 0)) {
      next.warnings = [...t.defaultWarnings];
    }
    onChange(next);
  };

  const autoSuggest = () => {
    const t = suggestTemplate({ name: hint?.name, category: hint?.category });
    applyTemplate(t.slug, true);
  };

  const has = (f: MetadataField) => fields.size === 0 || fields.has(f);

  return (
    <div className="space-y-4">
      {/* Selector de plantilla */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Plantilla de categoría</Label>
              <Select
                value={v.metadata_template || "none"}
                onValueChange={(val) => (val === "none" ? set("metadata_template", null) : applyTemplate(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin plantilla — todos los campos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plantilla — mostrar todos</SelectItem>
                  {METADATA_TEMPLATES.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={autoSuggest} className="gap-1.5 self-end">
              <Wand2 className="h-3.5 w-3.5" /> Sugerir según nombre/categoría
            </Button>
          </div>
          {template && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="category">Específicos</TabsTrigger>
          <TabsTrigger value="composition">Sabor & Composición</TabsTrigger>
          <TabsTrigger value="specs">Ficha técnica</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
        </TabsList>

        {/* ---- Específicos por categoría ---- */}
        <TabsContent value="category" className="space-y-3 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Datos específicos de la categoría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {has("vaporizer_type") && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs text-muted-foreground">Tipo de evaporador</Label>
                  <Select
                    value={v.vaporizer_type || "none"}
                    onValueChange={(val) => set("vaporizer_type", val === "none" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No aplica</SelectItem>
                      {VAPORIZER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {has("battery_mah") && (
                <NumberField label="Batería" unit="mAh" value={v.battery_mah} onChange={(n) => set("battery_mah", n)} />
              )}
              {has("puffs_estimate") && (
                <NumberField label="Puffs estimados" value={v.puffs_estimate} onChange={(n) => set("puffs_estimate", n)} />
              )}
              {has("nicotine_mg") && (
                <NumberField label="Nicotina" unit="mg/mL" value={v.nicotine_mg} onChange={(n) => set("nicotine_mg", n)} step="0.1" />
              )}
              {has("capacity_ml") && (
                <NumberField label="Capacidad" unit="mL" value={v.capacity_ml} onChange={(n) => set("capacity_ml", n)} step="0.1" />
              )}
              {has("pg_vg_ratio") && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ratio PG/VG</Label>
                  <Input
                    value={v.pg_vg_ratio || ""}
                    placeholder="50/50, 30/70…"
                    onChange={(e) => set("pg_vg_ratio", e.target.value || null)}
                  />
                </div>
              )}
              {has("thc_percentage") && (
                <NumberField label="THC" unit="%" value={v.thc_percentage} onChange={(n) => set("thc_percentage", n)} step="0.01" />
              )}
              {has("cbd_percentage") && (
                <NumberField label="CBD" unit="%" value={v.cbd_percentage} onChange={(n) => set("cbd_percentage", n)} step="0.01" />
              )}
              {has("strain_type") && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs text-muted-foreground">Tipo de cepa</Label>
                  <Select
                    value={v.strain_type || "none"}
                    onValueChange={(val) => set("strain_type", val === "none" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No aplica</SelectItem>
                      {STRAIN_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {has("material") && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Material principal</Label>
                  <Input value={v.material || ""} onChange={(e) => set("material", e.target.value || null)} placeholder="Aluminio, vidrio…" />
                </div>
              )}
              {has("warranty_months") && (
                <NumberField label="Garantía" unit="meses" value={v.warranty_months} onChange={(n) => set("warranty_months", n)} />
              )}
            </CardContent>
          </Card>

          {has("compatibility") && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Compatibilidad</CardTitle></CardHeader>
              <CardContent>
                <TagInput
                  label="Dispositivos compatibles"
                  value={v.compatibility || []}
                  onChange={(x) => set("compatibility", x)}
                  placeholder="Ej. Pax 3, hilo 510…"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Sabor / Composición ---- */}
        <TabsContent value="composition" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {has("flavor_profile") && (
                <TagInput
                  label="Perfil de sabor"
                  value={v.flavor_profile || []}
                  onChange={(x) => set("flavor_profile", x)}
                  placeholder="Mango, Menta, Frutos rojos…"
                />
              )}
              {has("ingredients") && (
                <TagInput
                  label="Ingredientes"
                  value={v.ingredients || []}
                  onChange={(x) => set("ingredients", x)}
                  placeholder="Glicerina vegetal, Propilenglicol…"
                />
              )}
              {has("terpenes") && (
                <TagInput
                  label="Terpenos predominantes"
                  value={v.terpenes || []}
                  onChange={(x) => set("terpenes", x)}
                  placeholder="Mirceno, Limoneno, Pineno…"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Ficha técnica ---- */}
        <TabsContent value="specs" className="space-y-3 pt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" /> Ficha técnica estructurada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpecsEditor value={v.specifications} onChange={(x) => set("specifications", x)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Cumplimiento ---- */}
        <TabsContent value="compliance" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <TagInput
                label="Advertencias regulatorias"
                value={v.warnings || []}
                onChange={(x) => set("warnings", x)}
                placeholder="Mayores de 18 años, contiene nicotina…"
              />
              {template && template.defaultWarnings.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => set("warnings", Array.from(new Set([...(v.warnings || []), ...template.defaultWarnings])))}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" /> Añadir advertencias sugeridas para "{template.label}"
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {has("country_of_origin") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">País de origen</Label>
                    <Input
                      value={v.country_of_origin || ""}
                      onChange={(e) => set("country_of_origin", e.target.value || null)}
                      placeholder="México, China…"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedMetadataEditor;

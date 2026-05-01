import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export type ProductAttributes = {
  flavors?: string[];
  ingredients?: string[];
  allergens?: string[];
  warnings?: string;
  vaporizer_type?: string;
  concentration?: string;
  thc_content?: string;
  cbd_content?: string;
  volume_ml?: number | null;
  puffs?: number | null;
  battery_mah?: number | null;
  country_origin?: string;
  lab_tested?: boolean;
  coa_url?: string;
  extra?: Record<string, string>;
};

const VAPE_TYPES = [
  { value: "n_a", label: "No aplica" },
  { value: "cartridge", label: "Cartucho 510" },
  { value: "disposable", label: "Desechable" },
  { value: "pod", label: "Pod" },
  { value: "dry_herb", label: "Hierba seca" },
  { value: "battery", label: "Batería" },
];

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
    if (!v) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[32px] rounded-md border border-input bg-background p-2">
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

const AttributesEditor = ({
  value,
  onChange,
}: {
  value: ProductAttributes;
  onChange: (v: ProductAttributes) => void;
}) => {
  const v = value || {};
  const set = <K extends keyof ProductAttributes>(k: K, val: ProductAttributes[K]) =>
    onChange({ ...v, [k]: val });

  const extra = v.extra || {};
  const extraKeys = Object.keys(extra);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sabor & composición</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TagInput
            label="Sabores"
            value={v.flavors || []}
            onChange={(x) => set("flavors", x)}
            placeholder="Ej. Mango, Menta…"
          />
          <TagInput
            label="Ingredientes"
            value={v.ingredients || []}
            onChange={(x) => set("ingredients", x)}
            placeholder="Ej. Glicerina vegetal…"
          />
          <TagInput
            label="Alérgenos"
            value={v.allergens || []}
            onChange={(x) => set("allergens", x)}
            placeholder="Ej. Frutos secos…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Especificaciones técnicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Tipo de evaporador</Label>
            <Select value={v.vaporizer_type || "n_a"} onValueChange={(val) => set("vaporizer_type", val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VAPE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Concentración</Label>
            <Input value={v.concentration || ""} onChange={(e) => set("concentration", e.target.value)} placeholder="Ej. 500 mg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">País de origen</Label>
            <Input value={v.country_origin || ""} onChange={(e) => set("country_origin", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">THC</Label>
            <Input value={v.thc_content || ""} onChange={(e) => set("thc_content", e.target.value)} placeholder="<0.3%" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CBD</Label>
            <Input value={v.cbd_content || ""} onChange={(e) => set("cbd_content", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Volumen (ml)</Label>
            <Input
              type="number"
              value={v.volume_ml ?? ""}
              onChange={(e) => set("volume_ml", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Puffs</Label>
            <Input
              type="number"
              value={v.puffs ?? ""}
              onChange={(e) => set("puffs", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Batería (mAh)</Label>
            <Input
              type="number"
              value={v.battery_mah ?? ""}
              onChange={(e) => set("battery_mah", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm col-span-2 pt-1">
            <Checkbox checked={!!v.lab_tested} onCheckedChange={(c) => set("lab_tested", !!c)} />
            Probado en laboratorio (COA disponible)
          </label>
          {v.lab_tested && (
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs text-muted-foreground">URL del COA</Label>
              <Input value={v.coa_url || ""} onChange={(e) => set("coa_url", e.target.value)} placeholder="https://…" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Advertencias legales</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={v.warnings || ""}
            onChange={(e) => set("warnings", e.target.value)}
            rows={3}
            placeholder="No exceder dosis, mantener fuera del alcance de menores…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Atributos personalizados</CardTitle>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => set("extra", { ...extra, "": "" })}
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> Añadir
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {extraKeys.length === 0 && (
            <p className="text-xs text-muted-foreground">Pares clave/valor opcionales (ej. THC:18%).</p>
          )}
          {extraKeys.map((k, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={k}
                placeholder="clave"
                onChange={(e) => {
                  const newExtra = { ...extra };
                  const val = newExtra[k];
                  delete newExtra[k];
                  newExtra[e.target.value] = val;
                  set("extra", newExtra);
                }}
                className="w-1/3"
              />
              <Input
                value={extra[k]}
                placeholder="valor"
                onChange={(e) => set("extra", { ...extra, [k]: e.target.value })}
              />
              <Button
                size="icon"
                variant="ghost"
                type="button"
                onClick={() => {
                  const newExtra = { ...extra };
                  delete newExtra[k];
                  set("extra", newExtra);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttributesEditor;

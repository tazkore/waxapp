import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Upload } from "lucide-react";

const FIELDS = [
  { key: "name", label: "Nombre *", required: true },
  { key: "price", label: "Precio" },
  { key: "sku", label: "SKU" },
  { key: "image_url", label: "URL imagen" },
  { key: "description", label: "Descripción" },
  { key: "category", label: "Categoría" },
  { key: "gtin", label: "GTIN" },
  { key: "brand_name", label: "Marca" },
  { key: "stock", label: "Stock" },
];

interface Props {
  onImported: () => void;
}

const CsvImporter = ({ onImported }: Props) => {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const onFile = async (file: File) => {
    const txt = await file.text();
    setCsvText(txt);
    sniffHeaders(txt);
  };

  const sniffHeaders = (txt: string) => {
    const firstLine = txt.split(/\r?\n/)[0] ?? "";
    const cols = firstLine.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    setHeaders(cols);
    // Auto-map by name match
    const m: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const found = cols.find((c) => c.toLowerCase().includes(f.key.replace("_", "")));
      if (found) m[f.key] = found;
    });
    setMapping(m);
  };

  const validate = async () => {
    if (!csvText && !sheetUrl) {
      toast({ title: "Pega CSV o URL de Google Sheets", variant: "destructive" });
      return;
    }
    if (!mapping.name) {
      toast({ title: "Mapea al menos la columna 'Nombre'", variant: "destructive" });
      return;
    }
    setBusy("validate");
    try {
      const { data, error } = await supabase.functions.invoke("parse-product-csv", {
        body: { csv_text: csvText || undefined, sheet_url: sheetUrl || undefined, mapping },
      });
      if (error || data?.error)
        throw new Error(data?.error?.message || error?.message || "Error");
      setRows(data.rows || []);
      setErrors(data.errors || []);
      if (!headers.length && data.header) setHeaders(data.header);
      toast({
        title: "Validado",
        description: `${data.rows.length} filas válidas, ${data.errors.length} errores`,
      });
    } catch (e: any) {
      toast({ title: "Error al validar", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const importAll = async () => {
    if (!rows.length) return;
    setBusy("import");
    try {
      // Ensure every row has a unique non-empty slug (guard against collisions with existing data)
      const rand = () => Math.random().toString(36).slice(2, 7);
      const slugify = (s: string) =>
        (s || "producto")
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 70) || "producto";
      const prepared = rows.map((r) => ({
        ...r,
        slug: `${(r.slug && r.slug.trim()) || slugify(r.name)}-${rand()}`,
      }));

      // Insert one-by-one with retry on unique-violation so a single dup doesn't abort the batch
      let imported = 0;
      const failed: string[] = [];
      for (const row of prepared) {
        let attempt = 0;
        let currentSlug = row.slug;
        while (attempt < 4) {
          const { error } = await supabase.from("products").insert({ ...row, slug: currentSlug });
          if (!error) { imported++; break; }
          if (error.code === "23505" && /slug/i.test(error.message)) {
            currentSlug = `${slugify(row.name)}-${rand()}${rand()}`;
            attempt++;
            continue;
          }
          failed.push(`${row.name}: ${error.message}`);
          break;
        }
        if (attempt >= 4) failed.push(`${row.name}: no se pudo generar slug único`);
      }

      if (imported === 0 && failed.length) throw new Error(failed[0]);
      toast({
        title: failed.length ? "Importación parcial" : "Importados",
        description: `${imported} productos creados${failed.length ? ` · ${failed.length} con error` : ""}`,
        variant: failed.length ? "default" : "default",
      });
      setCsvText("");
      setSheetUrl("");
      setHeaders([]);
      setRows([]);
      setErrors([]);
      onImported();
    } catch (e: any) {
      toast({ title: "Error al importar", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Importar CSV o Google Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subir CSV</Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-6 cursor-pointer hover:border-primary/40 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>Selecciona archivo .csv</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">o URL pública de Google Sheets</Label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
              <p className="text-[10px] text-muted-foreground">
                Compartir → "Cualquier persona con el enlace"
              </p>
            </div>
          </div>

          {csvText && (
            <div className="space-y-1">
              <Label className="text-xs">Vista previa CSV</Label>
              <Textarea
                value={csvText.slice(0, 800) + (csvText.length > 800 ? "…" : "")}
                readOnly
                rows={4}
                className="font-mono text-[10px]"
              />
            </div>
          )}

          {headers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Mapeo de columnas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <select
                      value={mapping[f.key] || ""}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                      className="w-full bg-muted border border-border rounded px-2 py-1 text-xs"
                    >
                      <option value="">— ignorar —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={validate} disabled={busy !== null} className="gap-2">
              {busy === "validate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Validar
            </Button>
            <Button
              onClick={importAll}
              disabled={busy !== null || rows.length === 0}
              variant="default"
              className="gap-2"
            >
              {busy === "import" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar {rows.length || ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> {errors.length} errores
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-auto space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="text-xs text-destructive">
                Fila {e.row} · {e.field}: {e.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vista previa — {rows.length} filas válidas</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto space-y-1">
            {rows.slice(0, 50).map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-1.5 rounded bg-muted/30 text-xs">
                <Badge variant="outline" className="text-[10px]">{i + 1}</Badge>
                <span className="font-medium truncate flex-1">{r.name}</span>
                <span className="text-muted-foreground">${r.price}</span>
                <span className="text-muted-foreground truncate">/{r.slug}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CsvImporter;

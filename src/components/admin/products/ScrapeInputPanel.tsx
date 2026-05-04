import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Globe, Download, Wand2, Sparkles, Map as MapIcon, AlertCircle } from "lucide-react";

export type Provider =
  | "firecrawl"
  | "jina"
  | "scrapingbee"
  | "readability"
  | "browserless"
  | "scraperapi"
  | "scrapfly"
  | "diffbot"
  | "zenrows";

const PROVIDERS: Array<{ id: Provider; label: string; hint: string; free?: boolean }> = [
  { id: "jina", label: "Jina Reader", hint: "Sin API key · recomendado", free: true },
  { id: "readability", label: "Microlink-style", hint: "Fetch directo + JSON-LD/OG", free: true },
  { id: "firecrawl", label: "Firecrawl", hint: "Más preciso · requiere créditos" },
  { id: "diffbot", label: "Diffbot Product", hint: "Producto estructurado de alta calidad" },
  { id: "scrapfly", label: "Apify-style (Scrapfly)", hint: "Render JS + anti-bot" },
  { id: "browserless", label: "Browserless", hint: "Chrome headless con JS" },
  { id: "scraperapi", label: "ScraperAPI", hint: "Render JS + proxy" },
  { id: "zenrows", label: "ZenRows", hint: "Render JS + bypass" },
  { id: "scrapingbee", label: "ScrapingBee", hint: "JS rendering, requiere key" },
];

const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

interface Props {
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  useAi: boolean;
  onUseAiChange: (v: boolean) => void;
  busyKey: string | null;

  /** Single product URL extraction */
  onExtractSingle: (url: string) => void;
  /** Bulk extraction from a list of URLs */
  onExtractBulk: (urls: string[]) => void;
  /** Optional domain mapping (Firecrawl-map flow) */
  onMapDomain: (url: string) => void;
}

const ScrapeInputPanel = ({
  provider,
  onProviderChange,
  useAi,
  onUseAiChange,
  busyKey,
  onExtractSingle,
  onExtractBulk,
  onMapDomain,
}: Props) => {
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  const parsedBulk = Array.from(
    new Set(
      bulkText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s && isHttpUrl(s)),
    ),
  );

  const ProviderSelect = (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Motor de extracción
      </label>
      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value as Provider)}
        className="bg-background border border-border rounded-md px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-muted-foreground/80">
        {PROVIDERS.find((p) => p.id === provider)?.hint}
      </span>
    </div>
  );

  const AiToggle = (
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-2">
      <Checkbox checked={useAi} onCheckedChange={(v) => onUseAiChange(!!v)} />
      <Sparkles className="h-3 w-3 text-primary" />
      <span>Usar IA si JSON-LD/OG no son suficientes</span>
    </label>
  );

  return (
    <Card className="border-white/5 bg-[hsl(var(--card))]">
      <CardContent className="p-4 sm:p-5">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="single" className="gap-2">
              <Globe className="h-3.5 w-3.5" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Masivo
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapIcon className="h-3.5 w-3.5" />
              Mapear dominio
            </TabsTrigger>
          </TabsList>

          {/* ---------------- Single ---------------- */}
          <TabsContent value="single" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  URL del producto
                </label>
                <Input
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  placeholder="https://tienda.com/producto/abc"
                />
              </div>
              {ProviderSelect}
              <Button
                onClick={() => onExtractSingle(singleUrl.trim())}
                disabled={!isHttpUrl(singleUrl.trim()) || !!busyKey}
                className="gap-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
              >
                {busyKey === "extract-single" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Extraer datos brutos
              </Button>
            </div>
            {AiToggle}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Los productos extraídos quedan en <strong className="text-foreground">staging</strong>. No se publican hasta que apruebes.
            </p>
          </TabsContent>

          {/* ---------------- Bulk ---------------- */}
          <TabsContent value="bulk" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Pega URLs separadas por coma, espacio o salto de línea
                </label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"https://tienda.com/producto/uno\nhttps://tienda.com/producto/dos\nhttps://otra.com/p/abc"}
                  rows={6}
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  {parsedBulk.length} URL(s) válida(s) detectada(s)
                </span>
              </div>
              <div className="space-y-3">
                {ProviderSelect}
                <Button
                  onClick={() => onExtractBulk(parsedBulk)}
                  disabled={parsedBulk.length === 0 || !!busyKey}
                  className="w-full gap-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
                >
                  {busyKey === "extract-bulk" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Extraer {parsedBulk.length || ""} datos brutos
                </Button>
              </div>
            </div>
            {AiToggle}
          </TabsContent>

          {/* ---------------- Map domain ---------------- */}
          <TabsContent value="map" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Dominio o URL raíz
                </label>
                <Input
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://tienda-ejemplo.com"
                />
              </div>
              {ProviderSelect}
              <Button
                onClick={() => onMapDomain(mapUrl.trim())}
                disabled={!isHttpUrl(mapUrl.trim()) || !!busyKey}
                variant="outline"
                className="gap-2 h-10"
              >
                {busyKey === "map" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Mapear sitio
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Descubre todas las URLs del sitio y luego selecciona cuáles enviar al pipeline de extracción.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScrapeInputPanel;

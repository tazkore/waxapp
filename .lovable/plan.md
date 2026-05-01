
## Objetivo

Tres entregas en un mismo cambio sobre el módulo Productos del admin:

1. Mejorar el aspecto visual del área (tarjetas, tabla, vacíos, badges).
2. Añadir atributos ricos (sabores, tipo de evaporador, ingredientes, etc.) + botón "Completar todo con IA" en el editor.
3. Mejorar la importación con más proveedores de scraping y un botón global "Rellenar lo que falte con IA" tras extraer.

---

## 1) Rediseño visual de Productos

Archivo: `src/components/admin/ProductsSection.tsx`

- **Header**: bloque con KPIs rápidos (Total · Activos · Borradores · Sin imagen · SEO promedio) usando `Card` compactas en grid de 5.
- **Toolbar mejorada**: búsqueda + filtros rápidos (Todos / Activos / Borradores / Sin imagen / SEO bajo) y selector de orden (Recientes / Nombre / Precio / SEO).
- **Vista dual** con toggle: "Tarjetas" (grid 1/2/3 col responsive con miniatura grande, badges) y "Tabla" (densa, ordenable).
- **Tarjeta producto**: imagen 16:9 con `aspect-video`, overlay de badges (Borrador/Destacado/noindex/Sin stock), barra inferior con SEO en `Progress` y precio.
- **Empty state** con ilustración usando icono y CTA dobles (Nuevo · Importar URL).
- **Skeletons** en lugar de spinner solo.
- **Estado seleccionable** para acciones masivas: activar/desactivar, marcar destacado, eliminar.

## 2) Atributos extendidos + Completar todo con IA

### Migración (nueva columna JSONB `attributes`)

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin
  ON public.products USING GIN (attributes);
```

`attributes` guardará claves estructuradas (todas opcionales, sin romper nada existente):

```text
flavors:        string[]   ej. ["Mango","Menta"]
ingredients:    string[]
allergens:      string[]
vaporizer_type: enum  "cartridge|disposable|pod|dry_herb|battery|n_a"
concentration:  string     ej. "500mg CBD"
thc_content:    string     ej. "<0.3%"
cbd_content:    string
volume_ml:      number
puffs:          number
battery_mah:    number
warnings:       string
country_origin: string
lab_tested:     boolean
coa_url:        string     (Certificate of Analysis)
extra:          Record<string,string>  (campos libres clave/valor)
```

### UI en el editor de producto (`ProductEditor`)

- Nueva pestaña **"Atributos"** entre "Contenido" y "SEO & Meta".
- Componente `AttributesEditor` con:
  - Multi-tag inputs: `flavors`, `ingredients`, `allergens`, `warnings`.
  - Select para `vaporizer_type`.
  - Inputs numéricos: `volume_ml`, `puffs`, `battery_mah`.
  - Inputs texto: `concentration`, `thc_content`, `cbd_content`, `country_origin`, `coa_url`.
  - Switch `lab_tested`.
  - Tabla dinámica de "Extra" (par clave/valor, añadir/quitar).
- En catálogo: badges discretos para sabores principales y tipo de vaporizador.

### Botón "Completar todo con IA" (en cabecera del editor)

- Nueva edge function `product-autofill` que recibe lo que ya hay del producto y devuelve, vía tool-calling de Lovable AI (`google/gemini-3-flash-preview`), una propuesta completa para campos vacíos:
  - `short_description`, `description`, `long_description_html`
  - `meta_title`, `meta_description`, `focus_keyword`, `meta_keywords`
  - `category`, `tags`
  - `attributes` (sabores, ingredientes, tipo evaporador, advertencias, etc., inferidos del nombre/descripción).
- Reglas:
  - **No sobreescribe** valores que ya tiene el usuario salvo confirmación (modal de diff con checkboxes "aplicar este campo").
  - Marca atributos inciertos como `extra.uncertain_*`.
  - Si no hay imagen, llama también a `find-product-image` para sugerir una.
- UI: botón `Sparkles "Completar todo con IA"` arriba a la derecha del Dialog → abre `Drawer/Dialog` con preview lado-a-lado y selección de qué aplicar → "Aplicar seleccionados".

## 3) Importación: más proveedores + autofill IA

### Más proveedores en `supabase/functions/_shared/scrape-providers.ts`

Agregar a la unión `Provider` y a `providerScrape` / `providerMap`:

- `"crawl4ai"` → endpoint público `https://r.jina.ai/` ya existe; añadimos:
- `"browserless"` → `https://chrome.browserless.io/content?token=…` (requiere `BROWSERLESS_API_KEY`).
- `"scraperapi"` → `https://api.scraperapi.com?api_key=…&url=…&render=true` (requiere `SCRAPERAPI_KEY`).
- `"scrapfly"` → `https://api.scrapfly.io/scrape?key=…&url=…&render_js=true` (requiere `SCRAPFLY_API_KEY`).
- `"diffbot"` → `https://api.diffbot.com/v3/product?token=…&url=…` devuelve producto estructurado directamente (alta calidad para e-commerce, `DIFFBOT_TOKEN`).
- `"zenrows"` → `https://api.zenrows.com/v1/?apikey=…&url=…&js_render=true` (`ZENROWS_API_KEY`).

Cada nuevo proveedor:
- Si su secret no está, devuelve error claro "Añade `<KEY>` para usar este proveedor" (sin romper la UI).
- Diffbot tiene fast path: si responde con `objects[0].type==='product'`, se mapea directo a producto (sin pasar por `extractProductFromHtml` ni IA).

Los secrets se solicitarán al usuario después de aprobar el plan, vía `add_secret` (solo cuando elija un proveedor que lo requiera). No se piden de entrada para no bloquear.

### UI Importer (`src/components/admin/products/ProductImporter.tsx`)

- Lista `PROVIDERS` ampliada con grupo "Gratis" y "Con API":

  ```text
  Gratis:        Sin API · Jina Reader
  Con API key:   Firecrawl · Diffbot · Browserless · ScraperAPI · Scrapfly · ZenRows · ScrapingBee
  ```

- Selector renderizado como `Select` agrupado con descripción + badge "Requiere key".
- Botón **"Completar lo que falte con IA"** sobre la lista de productos extraídos: itera los seleccionados con concurrencia 3 llamando `product-autofill` para rellenar `attributes`, `description`, `category`, `meta_*` antes de importar.
- Mejor UX de la lista de extraídos: tarjetas con miniatura grande, badges de campos faltantes (Sin imagen / Sin precio / Sin descripción) y precio formateado.

## Detalles técnicos

- **Validación**: `validateRow` en `ProductImporter` se extiende para serializar `attributes` (siempre objeto, nunca string).
- **Compatibilidad**: ningún campo nuevo es obligatorio; productos antiguos siguen funcionando.
- **Tipos**: `src/integrations/supabase/types.ts` se regenera solo tras la migración; el código usa casts donde aplique.
- **Edge functions a crear**: `product-autofill` (con `verify_jwt` por defecto, valida rol admin/super_admin/moderator vía service role + JWT del caller).
- **Edge functions a editar**: `_shared/scrape-providers.ts`, `firecrawl-map`, `firecrawl-scrape-products` (ampliar enum de provider).
- **Memoria**: actualizar `mem://index.md` para mencionar atributos enriquecidos y proveedores adicionales.

## Archivos afectados

- Crear: `supabase/migrations/<ts>_products_attributes.sql`, `supabase/functions/product-autofill/index.ts`, `src/components/admin/products/AttributesEditor.tsx`, `src/components/admin/products/AiAutofillDialog.tsx`.
- Editar: `src/components/admin/ProductsSection.tsx`, `src/components/admin/products/ProductImporter.tsx`, `supabase/functions/_shared/scrape-providers.ts`, `supabase/functions/firecrawl-map/index.ts`, `supabase/functions/firecrawl-scrape-products/index.ts`, `mem://index.md`.

## Fuera de alcance (siguiente iteración)

- Migrar atributos a tablas relacionales (sabores como entidad propia con SKU stock por sabor).
- Editor visual rich-text para `long_description_html`.
- Bulk edit masivo desde la tabla.

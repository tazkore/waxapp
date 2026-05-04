## Objetivo

En la sección **Productos** del admin, exponer una barra de acciones unificada con todos los flujos que pediste y reparar el scraping para que no falle en silencio cuando un proveedor está caído o sin créditos.

## 1. Toolbar de acciones en Productos

En `src/components/admin/ProductsSection.tsx`, junto al botón "Nuevo producto", agregar un grupo de botones (responsive, agrupados en un dropdown "Más" cuando no quepan):

- **Plantilla CSV** — descarga `productos-plantilla.csv` generado en cliente con headers exactos: `name,price,sku,image_url,description,category,gtin,brand_name,stock` (y una fila de ejemplo). Usa `Blob` + `URL.createObjectURL`.
- **Importar CSV** — atajo que cambia a la pestaña `csv` (ya existe `CsvImporter`).
- **Importar de URL (IA)** — atajo que cambia a la pestaña `import` y preselecciona modo "Individual" en `ScrapeInputPanel`.
- **Importar desde sitio web (IA)** — atajo a pestaña `import` modo "Mapeo de dominio".
- **Exportar CSV** — descarga el catálogo actual filtrado (`filtered`) como CSV con las mismas columnas que la plantilla + `slug,is_active`. Escape correcto de comas/comillas.
- **Nuevo producto** — se mantiene.

Agregar también el banner ya solicitado:
> 💡 Descarga la plantilla CSV, llena los campos y súbela en "Importar CSV". Los nombres de columna deben mantenerse igual.

Se renderiza como `Alert` arriba de los Tabs cuando `tab === "csv"`.

## 2. Reparar el scraping

Síntomas típicos: Firecrawl devuelve 402 (sin créditos) o 500, y el flujo aborta sin productos. Cambios:

### Edge function `firecrawl-scrape-products`
- Cuando `provider === "firecrawl"` y `providerScrape` lanza error, **reintentar automáticamente con `jina`** (gratis, sin key) antes de marcar la URL como fallida. Loggear `provider_used` en cada producto y en `failures[].used_provider`.
- Mejorar `failures` para devolver `reason` más legible (status HTTP + primera línea del body) y propagarla en la respuesta.
- Si TODAS las URLs fallan, devolver `error.code = "PROVIDER_FAIL"` con el primer mensaje (hoy a veces devuelve 200 con `extracted: 0` y el front solo muestra "Sin productos extraídos").

### Edge function `firecrawl-map`
- Mismo patrón: si `firecrawl` falla, intentar `jina` map alternativo (Jina no mapea, así que cuando Firecrawl falle devolver mensaje claro "Mapeo requiere Firecrawl con créditos. Usa Importar Individual o cambia de proveedor.").

### Front `ProductImporter.tsx`
- En `extractUrls`, mostrar en el toast el `provider_used` real cuando hubo fallback ("Extraído con Jina (fallback)").
- Si `data.failures` viene con elementos, mostrarlos en un `Alert` colapsable bajo el panel de input con la URL y la razón, para que el usuario sepa por qué no se extrajo.
- Si `extracted === 0`, sugerir explícitamente: "Cambia el motor a 'Jina Reader (gratis)' o 'Microlink-style' y reintenta".

### `ScrapeInputPanel.tsx`
- Reordenar `PROVIDERS` para que **Jina** y **Readability** (gratis, sin key) aparezcan primero junto a Firecrawl, con badge "Gratis". Esto reduce los fallos por créditos agotados.

## 3. Detalles técnicos

- No se requiere migración de DB.
- No se requieren nuevos secrets.
- Cambios contenidos en:
  - `src/components/admin/ProductsSection.tsx` (toolbar, banner, helpers `downloadTemplate`, `exportCsv`)
  - `src/components/admin/products/ProductImporter.tsx` (mostrar failures, prop opcional para preseleccionar tab interno)
  - `src/components/admin/products/ScrapeInputPanel.tsx` (orden de proveedores + badge "Gratis", aceptar `initialMode` opcional)
  - `supabase/functions/firecrawl-scrape-products/index.ts` (fallback a Jina, mejores errores)
  - `supabase/functions/firecrawl-map/index.ts` (mensaje claro cuando Firecrawl falla)

## Resultado esperado

- Una barra superior visible con: Plantilla CSV · Importar CSV · Importar de URL (IA) · Importar desde sitio web (IA) · Exportar CSV · Nuevo.
- Banner informativo en pestaña CSV.
- Scraping que ya no se queda mudo: si Firecrawl falla, automáticamente cae a Jina y muestra qué proveedor se usó; si todo falla, lista las URLs problemáticas con el motivo y sugiere cambiar de proveedor.

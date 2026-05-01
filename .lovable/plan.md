# Plan — Importador robusto, SEO, canales y página de producto

Trabajo grande pero acotable a 7 entregables coordinados. Todo respeta el design system (Dark Tech, neon green) y los memos del proyecto.

## 1. Edge function `firecrawl-scrape-products` reescrita

- Validación con Zod del body: `urls: string[] (1..30, URL válida)`, `job_id?: uuid`, `provider?: 'firecrawl'|'jina'|'scrapingbee'|'readability'`, `preview?: boolean`, `use_ai?: boolean (default true)`.
- Errores estructurados: `{ error: { code, message, details } }` con códigos `INVALID_BODY`, `UNAUTHORIZED`, `FORBIDDEN`, `PROVIDER_FAIL`, `AI_FAIL`, `DB_FAIL`.
- Logging detallado por URL (`console.log` con `job_id`, índice, status, dur ms).
- Modo `preview=true`: limita a las primeras 2 URLs y NO actualiza `import_jobs`.
- Soporte multi-proveedor usando `_shared/scrape-providers.ts` (firecrawl/jina/scrapingbee) + nuevo proveedor **`readability`** (fetch directo + parser HTML→texto en Deno, sin API key, gratis).
- Extracción híbrida: si `use_ai=true` → IA Lovable; si no, regex/JSON-LD parser (Product schema en `<script type="application/ld+json">`, OpenGraph `og:title/price/image`).
- Update granular de `import_jobs` (status: scraping → extracting → completed/failed) con `error` poblado en fallo.

## 2. Nueva edge function `parse-product-csv`

- Acepta `{ csv_text | rows[], mapping: { name, price, sku, image_url, description, category, gtin, brand_name } }`.
- Valida con Zod, normaliza, devuelve `{ rows, errors[] }` para preview antes de insert.

## 3. Tabla `import_jobs` — usos extendidos

- Sin migración nueva; ya existe. Añadir índice si falta y usar columnas `source_type` (informal en `branding` JSONB).
- UI nueva `ImportJobsHistory.tsx` (en ProductsSection tab "Historial"):
  - Lista jobs (status badge, urls_found, products_extracted, error, fecha).
  - Acciones: **Reintentar** (re-llama scrape con `urls=discovered_urls`), **Cancelar** (status='cancelled'), **Ver productos** (modal con `extracted_products`), **Eliminar**.

## 4. ProductsSection — Importer rediseñado

Tabs internos en ProductsSection: `Catálogo | Importar URL | Importar CSV | Historial`.

**Importar URL** (`ProductImporter.tsx` reescrito):
- Selector proveedor incluye **"Sin API (gratis)"** = `readability` y **"Jina (gratis sin key)"** ya soportado.
- Validación cliente: URL válida obligatoria, mínimo 1 URL seleccionada.
- Botón nuevo **"Vista previa (1-2 productos)"** → llama con `preview=true`, muestra resultado en card antes de extraer todo.
- Botón **"Extraer seleccionados"** → crea `import_jobs` row, pasa `job_id`.
- Mensajes de error parseados desde `{error:{code,message}}` con fallback genérico.

**Importar CSV/Sheets**:
- Drag-drop CSV o pegar URL pública de Google Sheets (CSV export).
- Mapeo visual columnas → campos producto.
- Preview tabla con validación (precio numérico, slug colisión, GTIN check).
- Insert como borradores.

## 5. Editor de producto — mejoras SEO

- **Slug auto**: al cambiar nombre genera slug, comprueba colisión vía `select id from products where slug=?`, sufija `-2`, `-3`. Preview URL: `/{categoria}/{marca}/{slug}`.
- **Schema/JSON-LD validator**: panel con preview JSON-LD generado, validación de campos requeridos por `schema_type` (Product: name, image, offers.price), badges errores/warnings y mock "rich result" estilo Google.
- **Estado** flujo `draft | inactive | published`:
  - Botón "Publicar" → `is_active=true`, `noindex=false`, `nofollow=false`, llama trigger sitemap refresh.
  - Botón "Despublicar" → `is_active=false`, `noindex=true`.

## 6. Página pública `/producto/:slug`

Nueva ruta resolviendo por `slug` desde tabla `products` (no por id estático).
- Galería con thumbnails (`gallery_urls` + `image_url`).
- Descripción larga (`long_description_html` con DOMPurify).
- Especificaciones técnicas (dimensions JSONB, weight_grams, GTIN, MPN, brand_name).
- JSON-LD `Product` completo (offers, aggregateRating si existe, brand).
- "Productos relacionados" por `category` o `brand_id` (8 cards).
- Breadcrumb categoría > marca > producto.
- Fallback al `ProductDetail` legacy si slug = id estático.

## 7. SEO & Indexación

- `generate-sitemap` actualizada para incluir `/producto/{slug}` (products activos), `/blog/{slug}` (published), categorías estáticas.
- Nueva edge function `generate-robots-txt` retornando `robots.txt` con `Sitemap:` URL.
- Botón en SeoSection "Regenerar sitemap" (sólo limpia cache UI, sitemap se sirve dinámico).

## 8. ChannelsSection con test de conexión

- Cards Web/Amazon/Mercado Libre muestran estado real:
  - Web: siempre activo, link a tema.
  - Amazon: lee `amazon_config.is_active`, `last_sync_at`, conteo `amazon_orders`. Botón "Probar conexión" llama `amazon-sync` con `mode=test`.
  - Mercado Libre: si existe `integrations` con slug `mercadolibre`, mostrar estado; si no, CTA instalar.
- Cada card muestra "Últimos pedidos importados" (3 más recientes).

## Resumen técnico (componentes/archivos)

```text
supabase/functions/
  firecrawl-scrape-products/index.ts   (reescrito + Zod + readability + preview)
  parse-product-csv/index.ts           (nueva)
  generate-sitemap/index.ts            (extendida productos+blog)
  generate-robots-txt/index.ts         (nueva)
  _shared/scrape-providers.ts          (añadir provider 'readability')

src/components/admin/
  ProductsSection.tsx                  (tabs + integra subcomponentes)
  products/ProductImporter.tsx         (extraído + preview + validación)
  products/CsvImporter.tsx             (nuevo)
  products/ImportJobsHistory.tsx       (nuevo)
  products/SchemaValidator.tsx         (nuevo)
  products/SlugField.tsx               (nuevo, autogenerate + colisión)
  ChannelsSection.tsx                  (rediseño con estado real + test)

src/pages/
  ProductDetail.tsx                    (rediseñado, resuelve por slug DB)
  (router) /producto/:slug             (añadir ruta en App.tsx)
```

Sin cambios destructivos en DB; todo se apoya en columnas ya creadas (`products.slug`, `gallery_urls`, `long_description_html`, `import_jobs.*`).

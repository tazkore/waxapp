# AI Scraping & Enrichment Hub

Rediseño de la pestaña **Importar** dentro de Productos. Reutiliza toda la infraestructura ya construida (Firecrawl/Jina/Diffbot multi-proveedor, `product-autofill`, `find-product-image`, `normalizeSeoMetadata`, `validateProductRow`, `import_jobs`, staging por `is_active=false`) y la reorganiza con la UX que pediste.

## 1. Panel de entrada con Tabs

Reemplazar la card "Importar productos desde URL" por un componente `ScrapeInputPanel` con `Tabs` shadcn (Dark Mode Tech: bg `#0A0A0A`, surface `#1A1A1A`, acento neón `#00E676`):

- **Tab "Individual"**
  - `Input` para una URL de producto.
  - `Select` "Motor de Extracción" con los proveedores ya soportados por `firecrawl-scrape-products` / `_shared/scrape-providers.ts`: Firecrawl, Jina Reader, Diffbot, ScrapingBee, Browserless, ScraperAPI, Scrapfly, ZenRows, "Sin API (gratis)" (readability). Mantenemos los nombres reales en backend; etiqueta UI: Firecrawl / Jina / Diffbot / Microlink-style (readability) / Apify-style (scrapfly/zenrows) / Manual (textarea libre que abre un modal para pegar título+precio+desc).
  - Botón **"Extraer Datos Brutos"** (icono `Globe` o `Download`).
  - Bajo el capó: invoca `firecrawl-scrape-products` con `urls:[url]` y push directo al staging local.

- **Tab "Masivo (Bulk)"**
  - `Textarea` grande aceptando URLs separadas por coma, espacio o salto de línea.
  - Mismo `Select` de motor + checkbox "Usar IA si JSON-LD/OG insuficiente" (ya existe, `useAi`).
  - Botón **"Extraer Datos Brutos"** que parsea, valida con `isHttpUrl`, deduplica, crea `import_jobs` row y llama `firecrawl-scrape-products` por lote.
  - Conservamos el flujo "Mapear sitio" como tercer tab opcional **"Mapear dominio"** (lo que hoy hace `firecrawl-map`) para no perder funcionalidad existente.

Toast de éxito tras extracción: `"N productos en staging"`.

## 2. Tabla de Staging (Borradores)

Se sustituye la lista vertical de `ProductPreviewCard` por una tabla densa `StagingTable` (componente nuevo) con columnas:

| Foto | Nombre Original | Precio | SEO | Acciones |
|---|---|---|---|---|

- **Foto**: thumbnail 56×56. Si `image_url` falta → placeholder gris con botón mini `🔍 Buscador IA` que abre `AutoImagePicker` ya existente (busca con `find-product-image`).
- **Nombre Original**: muestra el nombre crudo extraído + chip discreto con `source_url`.
- **Precio**: `$X` o badge rojo "Sin precio".
- **SEO**: badge color según `validateProductRow`:
  - 🟢 Verde "Optimizado" si no hay errores ni warnings de `meta_title`/`meta_description`/`focus_keyword`/`tags`.
  - 🟡 Amarillo "Incompleto" si solo warnings.
  - 🔴 Rojo "Faltante" si errores.
- **Acciones por fila**:
  - Botón `✨ IA` → abre **modal de enriquecimiento** (ver §3).
  - Botón `🔍 Imagen` → abre `AutoImagePicker`.
  - Botón `✏️ Editar` → abre el mismo modal en pestaña "Datos básicos".
  - Botón 🗑 quitar de staging.
- Checkbox por fila + checkbox "seleccionar todos" en header.

Vista densa (table) por defecto; toggle a vista grid (cards actuales) para retrocompatibilidad.

## 3. Modal de Enriquecimiento IA (`EnrichmentDialog`)

Nuevo componente `src/components/admin/products/EnrichmentDialog.tsx`. Se abre al hacer clic en `✨ IA` en una fila, o al hacer clic en `Editar`. Pestañas:

- **Datos limpios**
  - `Nombre Limpio` (input, prellenado con `name`).
  - `Categoría sugerida` + `Marca sugerida` (reutiliza `categoryBrandSuggester` y `applyRowPatch`).
  - `Precio`, `Stock`, `SKU`, `GTIN`.
- **SEO**
  - `meta_title` (contador 60 char, color rojo/verde).
  - `meta_description` (contador 160 char).
  - `focus_keyword`.
  - `tags` (chips editables).
  - Botón **"Generar con IA"** → `product-autofill` con `only_missing:false` para esta fila (reusa `autoFillAiRow` extraído).
  - Botón **"Normalizar"** → `normalizeSeoMetadata` para esta fila.
- **Atributos / Metadatos avanzados**
  - Embebe el `AdvancedMetadataEditor` existente sobre `it.attributes` y `it.specifications` para la fila staging.

Footer del modal: `Cancelar` / `Guardar cambios en staging` (sólo actualiza `products[i]` en memoria, no toca BD).

Toast `"Producto enriquecido — N campos actualizados"`.

## 4. Sistema inteligente de imágenes

Ya existe el flujo: `AutoImagePicker` + edge function `find-product-image`. Lo cableamos en:

- Thumbnail vacío de la tabla de staging → botón overlay `🔍 Buscador IA`.
- Acción individual `Imagen` por fila.
- Acción global existente `Auto-imágenes (N)` se conserva pero se mueve a la barra de acciones de la tabla.
- Dentro del `EnrichmentDialog` pestaña "Datos limpios" se muestra galería seleccionable cuando el usuario expande "Imagen".

Si `find-product-image` devuelve 0 resultados → mensaje claro "No se encontraron imágenes; pega una URL manual" + input.

## 5. Aprobación final

Barra inferior sticky `PublishBar` cuando hay seleccionados:

- Resumen: `X seleccionados · Y listos · Z con errores · Completitud media W%` (reutiliza `aggregateValidation`).
- Botón gigante neón `🚀 Publicar en Inventario` (verde `#00E676`):
  - Sólo habilitado si todos los seleccionados tienen `validateProductRow.canImport === true`.
  - Si hay seleccionados con errores → muestra dialog "Saltar N inválidos y publicar Y" / "Cancelar".
  - Pipeline: `validateRow` → `insertWithRetry("products", rows)` con `is_active:false` (queda como borrador); luego dialog opcional "¿Activar ahora en tienda?" que hace `update is_active:true`. Mantiene la lógica RLS y `import_jobs` actual.
- Toasts por paso: "Validando…", "Insertando 12 productos…", "✅ 12 publicados como borradores", "✅ 12 activados en tienda".

## 6. Limpieza visual Dark Mode Tech

- Cards: `bg-[#1A1A1A] border-white/5`.
- Botones primarios: `bg-[#00E676] text-black hover:bg-[#00E676]/90 shadow-[0_0_20px_rgba(0,230,118,0.25)]`.
- Tabs activos: underline neón verde.
- Badges de estado: rojo `#FF5252`, ámbar `#FFB300`, verde `#00E676`.

## Archivos a crear / editar

**Crear**
- `src/components/admin/products/ScrapeInputPanel.tsx` — Tabs Individual / Bulk / Mapear dominio + select de proveedor.
- `src/components/admin/products/StagingTable.tsx` — tabla densa con SEO badge y acciones por fila.
- `src/components/admin/products/EnrichmentDialog.tsx` — modal IA + SEO + metadatos.
- `src/components/admin/products/PublishBar.tsx` — barra sticky inferior con publicar.

**Editar**
- `src/components/admin/products/ProductImporter.tsx` — refactor: extraer handlers (`autoFillAiRow`, `autoImageRow`, `applyRowPatch`, `importProducts`) y orquestar los nuevos sub-componentes; conservar `import_jobs`, `useCanImportProducts`, `RlsErrorPanel`, `previewProducts`, `selectedP`. Sin cambios de schema en BD ni de edge functions.
- `src/components/admin/products/ProductPreviewCard.tsx` — sigue disponible para la vista "grid" alternativa.

## Notas técnicas

- Estado de staging vive en `useState` dentro de `ProductImporter` (`products[]`, `selectedP:Set<number>`) tal cual hoy — no se persiste hasta "Publicar en Inventario".
- No se introducen nuevas tablas ni edge functions: todas las llamadas usan funciones ya desplegadas (`firecrawl-map`, `firecrawl-scrape-products`, `product-autofill`, `find-product-image`).
- Compatibilidad: `ImportedProductsPreviewSection` (lista de borradores ya en BD) sigue intacta y conserva su pestaña en el sidebar.
- Sin migraciones SQL.

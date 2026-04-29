## Resumen

Mejorar el flujo Remix de sub-tiendas para que cada cambio quede en **borrador con historial de versiones** (no se publica al instante), permita **revertir a la plantilla original**, **mejore con IA** la copia (textos, hero, tagline) tomando como base el sitio importado, y **descargue las imágenes** (logo, favicon, OG, hero) a Storage para no depender de la web original que será eliminada.

## Cambios de base de datos

**Nueva tabla `sub_store_versions`** (snapshots completos):
- `id`, `sub_store_id` (FK), `version_number` (int autoincremental por tienda)
- `label` (ej. "Inicial desde firecrawl", "Mejora IA", "Manual")
- `source` enum: `original_template` | `ai_improved` | `manual_edit` | `imported`
- `snapshot` jsonb (todo el estado: colores, fuentes, copy, urls de assets locales)
- `created_by`, `created_at`, `is_published` bool, `notes` text
- RLS: super_admin/admin gestionan; público no lee.

**Cambios en `sub_stores`**:
- `draft_snapshot jsonb` — borrador en edición (no visible al público).
- `published_version_id uuid` — FK a la versión actualmente publicada en `/s/:slug`.
- `original_version_id uuid` — FK a la versión "plantilla original" (la primera del Remix, inmutable).

`SubStorePage.tsx` siempre renderiza la versión publicada (no el draft).

## Edge functions

**Nueva `enhance-substore-copy`** (Lovable AI Gateway, Gemini 2.5 Flash):
- Input: snapshot actual + `source_html_excerpt` (guardado en draft).
- Tool-call `improve_copy` que devuelve: `tagline`, `hero_headline`, `hero_subtitle`, `description`, `seo_meta_title`, `seo_meta_description`, micro-copy de secciones.
- Reglas: tono Dark Mode Tech, español MX, no inventar productos, mantener nombre de marca.

**Nueva `download-substore-assets`**:
- Recibe `sub_store_id` + lista de URLs externas (logo, favicon, og, hero, gallery).
- Descarga con `fetch`, valida content-type imagen, sube a bucket `media` en `sub-stores/{slug}/{tipo}-{hash}.{ext}`.
- Devuelve URLs públicas y actualiza el draft. Maneja CORS / 404 con fallback al placeholder.

**Modificar `firecrawl-import-theme`**:
- Además de paleta/fuentes, devuelve `gallery_urls` (top 6 imágenes del hero/banners detectadas en el HTML) y guarda un `source_html_excerpt` (5–10 KB) en el draft para futuros enhancements IA.

## UI: `RemixBrandDialog` rediseñado en pestañas

```text
┌─────────────────────────────────────────┐
│ Remix: <marca>     [Borrador no publicado] │
├─────────────────────────────────────────┤
│ [Editor] [Mejorar con IA] [Historial]   │
├─────────────────────────────────────────┤
│ ...contenido según pestaña...           │
├─────────────────────────────────────────┤
│ [Restaurar original] [Guardar borrador] │
│           [Publicar versión]            │
└─────────────────────────────────────────┘
```

**Pestaña Editor**: campos actuales (colores, fuentes, hero) escribiendo en `draft_snapshot`. Muestra preview en vivo y badge "Borrador con cambios sin publicar".

**Pestaña Mejorar con IA**:
- Botón "Mejorar copy con IA" → llama `enhance-substore-copy`, muestra diff lado-a-lado (antes/después por campo) con checkboxes para aceptar campo por campo.
- Botón "Importar imágenes a almacenamiento" → llama `download-substore-assets`, muestra grid con miniaturas y permite elegir cuáles aplicar (logo / favicon / og / hero).
- Aviso: "Recomendado antes de eliminar la web original".

**Pestaña Historial**:
- Lista vertical de `sub_store_versions` (más reciente arriba), con badges: `Original` / `IA` / `Manual` / `Publicada`.
- Cada fila: fecha, autor, label, acciones: `Ver preview`, `Restaurar como borrador`, `Publicar esta versión`.
- La versión `original_version_id` siempre tiene botón destacado **"Volver a plantilla original"**.

**Acciones del footer**:
- `Guardar borrador`: actualiza `draft_snapshot` (no crea versión).
- `Publicar versión`: crea nuevo registro en `sub_store_versions` con el draft, lo marca `is_published=true`, actualiza `sub_stores.published_version_id`, copia campos al row de `sub_stores` para compatibilidad con `SubStorePage`.
- `Restaurar original`: copia `snapshot` de `original_version_id` al `draft_snapshot` (no publica hasta confirmar).

## Flujo end-to-end

1. Usuario abre Remix de "Cannesh" → si no existe sub-tienda, importa con Firecrawl + AI; al crear se guarda **versión #1 `original_template`** + se publica esa misma versión.
2. Usuario edita colores → queda en `draft_snapshot`. La URL pública sigue mostrando la #1.
3. Usuario presiona **"Mejorar con IA"** → revisa diffs, acepta los que quiera → draft actualizado.
4. Usuario presiona **"Importar imágenes"** → assets quedan en bucket `media`; URLs externas reemplazadas en draft.
5. Usuario presiona **"Publicar"** → se crea versión #2, se marca como publicada, sitio público actualizado.
6. En cualquier momento puede ir a Historial → **"Volver a plantilla original"** para regresar a la #1.

## Detalles técnicos clave

- **Idempotencia descarga assets**: hash SHA-1 de la URL como nombre de archivo para evitar duplicados en re-imports.
- **Tamaño límite por imagen**: 5 MB; descartar si excede o si content-type ≠ image/*.
- **Snapshot completo**: incluye TODOS los campos editables + `assets_map` (url externa → url interna) para auditoría.
- **`SubStorePage.tsx`**: lee `published_version_id` y aplica el snapshot publicado (sin tocar draft).
- **Migración compatible**: se mantienen las columnas planas existentes (color_primary, etc.) sincronizadas con la versión publicada para no romper consultas existentes.
- **Trigger SQL** `sync_published_version_to_sub_store`: cuando se publica una versión, copia los campos planos del snapshot a `sub_stores`.

## Archivos a crear / modificar

**Nuevos**:
- `supabase/migrations/<timestamp>_sub_store_versions.sql`
- `supabase/functions/enhance-substore-copy/index.ts`
- `supabase/functions/download-substore-assets/index.ts`
- `src/components/admin/remix/VersionHistoryTab.tsx`
- `src/components/admin/remix/AiEnhanceTab.tsx`
- `src/components/admin/remix/RemixEditorTab.tsx`
- `src/components/admin/remix/DiffField.tsx` (helper UI antes/después)

**Modificar**:
- `src/components/admin/RemixBrandDialog.tsx` → contenedor con tabs + lógica de draft/publicar/restaurar.
- `supabase/functions/firecrawl-import-theme/index.ts` → añadir `gallery_urls` y `source_html_excerpt`.
- `src/pages/SubStorePage.tsx` → leer versión publicada vs columnas planas.
- `src/integrations/supabase/types.ts` → autogenerado tras la migración.
## Plan: Resiliencia de imports + auto-imágenes para productos

### 1. Reintentos automáticos con backoff (cliente)
En `src/components/admin/products/ProductImporter.tsx`, envolver el `supabase.from("products").insert(rows)` en una utilidad `insertWithRetry` (3 intentos, 400ms / 1.2s / 3s). Solo reintentar errores transitorios (red, 5xx, timeout). Errores RLS (`code 42501` / "row-level security") **no se reintentan** — fallan inmediatamente al panel explicativo.

Cada fallo se registra en `import_jobs` (campo `error`) actualizando el `job_id` actual mediante:
```ts
await supabase.from("import_jobs").update({
  status: "failed",
  error: `RLS: ${msg}` o `Retry exhausted: ${msg}`
}).eq("id", currentJobId);
```
Para esto, guardar el `job_id` creado en `extract()` en un `ref` y reusarlo en `importProducts()`.

### 2. Pre-check de permisos RLS antes de importar
Nuevo helper `useCanImportProducts()` que combina `useUserRole()` y revisa `role ∈ {super_admin, admin, moderator}`. Llamar al montar `ProductImporter` y:
- Si `loading`: deshabilitar botón "Importar al catálogo".
- Si sin rol válido: mostrar `<Alert variant="destructive">` arriba del card de productos extraídos con mensaje claro y botón "Solicitar acceso" (mailto al super_admin) — y bloquear importación.

Adicionalmente, antes del insert real, hacer un `dry-run` con `supabase.from("products").select("id").limit(1).maybeSingle()` no aplica para INSERT, así que usaremos un test directo: `insert({ name: "__rls_check__", slug: "__rls_check_"+uuid, is_active: false })` con `.select().single()` y luego `delete().eq("id", ...)`. Si falla con 42501 → mostrar panel sin perder los productos extraídos.

### 3. Panel de error RLS accionable
Nuevo componente `src/components/admin/products/RlsErrorPanel.tsx`:
- Detecta strings: `"row-level security"`, `"violates"`, `"42501"`, `"new row violates"`.
- Muestra `<Alert>` con:
  - **Título**: "No tienes permisos para importar productos"
  - **Causa**: tu rol actual (`{role || "sin rol"}`) no puede insertar en `products`.
  - **Solución**: pedir a un super_admin que te asigne rol `admin` o `moderator` en *Staff*.
  - **Botón secundario**: "Ver detalles técnicos" (collapse con el mensaje original).
  - **Botón primario**: "Ir a Staff" (cambia a sección si es super_admin) o copiar email.

Integrar en `ProductImporter.tsx` debajo del card de productos extraídos cuando `rlsError` esté seteado.

### 4. Auto-búsqueda de imágenes para productos sin foto

**Nuevo edge function**: `supabase/functions/find-product-image/index.ts`
- Body validado con Zod: `{ name: string, brand?: string, category?: string, gtin?: string, count?: 1..5 }`.
- Estrategia en cascada:
  1. **GTIN/UPC** → fetch `https://www.openfoodfacts.org/api/v2/product/{gtin}.json` (gratis, sin key) → toma `image_url`.
  2. **Google Custom Search Image API** vía `LOVABLE_API_KEY` no aplica → usar **Bing/DuckDuckGo HTML scrape** server-side: `fetch("https://duckduckgo.com/?q=" + encodeURIComponent(query) + "&iax=images&ia=images&iaf=type:photo")` y extraer `vqd` + endpoint `i.js`. Free, sin API key.
  3. **Fallback IA**: usar Lovable AI (`google/gemini-3.1-flash-image-preview`) con prompt `"Generate a clean product photo of {name} on white background"` cuando los pasos 1-2 fallen.
- Devuelve `{ images: string[], source: "openfoodfacts"|"duckduckgo"|"ai_generated" }`.
- Sin auth requerido (sólo lectura); `verify_jwt = false` por defecto.

**UI**: en `ProductImporter.tsx`, después de `extract()`, para cada producto sin `images[0]`:
- Mostrar badge ámbar "Sin imagen" + botón ✨ "Buscar imagen".
- Al click: invocar `find-product-image` con `{name, brand, category, gtin}`, mostrar grid de 3-5 thumbnails, al seleccionar → asigna `it.images = [url]` y refresca.
- Botón global "Auto-buscar todas" arriba del card que itera los productos sin imagen en paralelo (límite 3 concurrentes).

**Variantes**: nuevo botón en el editor de variantes existente (revisar `ProductsSection.tsx` para encontrarlo en una iteración futura) — por ahora solo aplica a productos del importer; las variantes heredan la imagen del padre si no tienen propia.

### 5. Cambios en archivos

```text
NUEVOS:
  supabase/functions/find-product-image/index.ts
  src/components/admin/products/RlsErrorPanel.tsx
  src/components/admin/products/AutoImagePicker.tsx
  src/hooks/useCanImportProducts.ts
  src/lib/insertWithRetry.ts

EDITADOS:
  src/components/admin/products/ProductImporter.tsx
    - useRef<jobId>, insertWithRetry, pre-check RLS, RlsErrorPanel,
      AutoImagePicker integrado en cards de productos extraídos.
```

### Notas técnicas
- Backoff: `delays = [400, 1200, 3000]`, sólo si `error.code` ∈ {`PGRST301`, `503`, `504`} o mensaje contiene "fetch failed"/"network".
- RLS detection: `error.code === "42501" || /row-level security/i.test(error.message)`.
- DuckDuckGo image scrape devuelve URLs `image` directas — filtrar por extensiones válidas (jpg/png/webp) y dimensiones ≥300px si están disponibles.
- AI fallback sólo si las dos primeras fuentes fallan (consume créditos).
- No se modifica el esquema de DB; `import_jobs.error` ya existe.

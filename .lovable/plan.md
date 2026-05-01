## Validación automática de imágenes en `find-product-image`

Añadir un paso de validación HTTP por cada imagen devuelta por un proveedor antes de aceptar el resultado. Si tras validar quedan 0 imágenes válidas, se continúa automáticamente al siguiente proveedor de la cascada (mismo flujo de fallback que ya existe).

### Reglas de validación

Por cada URL candidata se hará un `HEAD` (con fallback a `GET` rangeado `bytes=0-1024` si el host no soporta HEAD):

1. **URL bien formada** — `new URL(u)` no lanza, protocolo `http(s):`.
2. **Status HTTP** — 200–299. Se siguen redirects automáticamente.
3. **Content-Type** — debe coincidir con `^image\/(jpeg|jpg|png|webp|gif|avif)$`.
4. **Tamaño** — `Content-Length` entre `minBytes` (default 3 KB, descarta placeholders/iconos) y `maxBytes` (default 10 MB).
5. **Timeout** — 4s por URL (`AbortController`), no bloquea la cascada.

Las validaciones se ejecutan en paralelo por proveedor (`Promise.allSettled`) para no penalizar latencia.

### Cambios en el flujo

```text
para cada provider en order:
  imgs = runProvider(...)            // candidatos
  valid = await validateImages(imgs) // filtra inválidas
  if valid.length > 0:
     return { images: valid, source, validated: true, tried }
  // si 0 válidas → reintenta con siguiente proveedor
```

Si **todos** los proveedores devuelven 0 imágenes válidas y `includeAi !== false`, se cae al generador IA (que produce data URLs y por tanto se omite la validación remota; se valida solo el prefijo `data:image/`).

### Parámetros nuevos del body

- `validate?: boolean` (default `true`) — permite desactivar la validación.
- `minBytes?: number` (default 3072).
- `maxBytes?: number` (default 10_485_760).
- `allowedTypes?: string[]` (default `["jpeg","png","webp","gif","avif"]`).

### Respuesta enriquecida

```json
{
  "images": ["..."],
  "source": "bing",
  "validated": true,
  "query": "...",
  "tried": [
    { "provider": "openfoodfacts", "found": 0, "valid": 0 },
    { "provider": "wikimedia", "found": 3, "valid": 0, "rejected": [{ "url": "...", "reason": "content-type:text/html" }] },
    { "provider": "bing", "found": 5, "valid": 4 }
  ]
}
```

El array `rejected` (limitado a 3 por proveedor) facilita debug desde el cliente.

### Detalles técnicos

- Nuevo helper `validateImageUrl(url, opts)` con HEAD → fallback GET range.
- Nuevo helper `validateImages(urls, opts)` que paraleliza y devuelve `{ valid, rejected }`.
- Razones de rechazo normalizadas: `bad-url`, `timeout`, `http:<status>`, `content-type:<type>`, `too-small:<n>`, `too-large:<n>`, `network`.
- El IA fallback conserva la URL data sin validar tamaño remoto.

### Archivos

- **Editado**: `supabase/functions/find-product-image/index.ts` (validador + integración en el loop de proveedores + nuevos params).
- Deploy de la función tras el cambio.

No se requieren migraciones, secrets nuevos ni cambios en cliente (es retro-compatible).

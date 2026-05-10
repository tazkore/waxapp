## Plan: Resumen por dominio + hreflang + sitemap multi-dominio

Tres mejoras complementarias al sistema multi-dominio ya implementado.

---

### 1. Vista resumen por dominio en el admin

**Crear** `src/components/admin/DomainsOverviewSection.tsx`:
- Consulta `orders` con `select('total, status, origin_domain, created_at')`.
- Agrupa en cliente por `origin_domain` (los nulos se muestran como "Sin dominio") y calcula:
  - **Pedidos totales** y **ventas totales (MXN)**
  - **Ticket promedio** = ventas / pedidos
  - **Desglose por estado** (pending / packed / shipped / delivered / refunded) con badges de color
  - **% del total** (share de ventas vs todos los dominios)
- Tabla responsiva con orden por ventas desc, cabecera con los chips de filtro (rango: 7d / 30d / 90d / todo).
- Card "Top dominio" arriba con el de mayor venta.
- Empty state cuando no hay `origin_domain` registrado todavía.
- Usa los tokens semánticos existentes (sin colores hardcodeados).

**Editar** `src/components/admin/AdminSidebar.tsx` y `src/pages/Admin.tsx`:
- Añadir entrada de menú "Dominios" (icono `Globe` de lucide) que monte `DomainsOverviewSection`.

### 2. Etiquetas hreflang entre dominios

**Editar** `src/config/siteConfig.ts`:
- Añadir a cada `SiteIdentity` un campo opcional `hreflang: string` (ej. `'es-MX'`, `'es-419'`, `'x-default'`).
- Definir un grupo `HREFLANG_ALTERNATES`: lista de los dominios que comparten contenido (todos los del array `SITES` salvo aliases `www.*`), para que cada página declare sus alternates.

**Editar** `src/hooks/useSeoMeta.ts`:
- Después de fijar el canonical, eliminar todos los `<link rel="alternate" data-hreflang="1">` previos e insertar uno por cada dominio alterno: `<link rel="alternate" hreflang="<lang>" href="<canonicalBase><pathname>" data-hreflang="1">`.
- Incluir `hreflang="x-default"` apuntando al dominio principal (waxapp.mx).
- Marca con `data-hreflang="1"` para limpieza determinista en navegaciones SPA.

### 3. Sitemap por dominio + robots multi-dominio

**Editar** `supabase/functions/generate-sitemap/index.ts`:
- Aceptar query param `?host=<hostname>` (o leerlo del header `x-forwarded-host` cuando proxiado).
- Resolver la base URL con `getSiteByHost`-equivalente embebido (mapa duplicado mínimo en el edge function: hostname → canonicalBase) — no podemos importar el archivo TS del frontend, así que se replica un mapa pequeño.
- Reemplazar `SITE_URL` por la `canonicalBase` resuelta del host. Fallback al env `SITE_URL` o `https://waxapp.mx`.
- Para cada `<url>`: añadir bloque `<xhtml:link rel="alternate" hreflang="<lang>" href="<base+path>"/>` por cada dominio del grupo. Declarar el namespace `xmlns:xhtml="http://www.w3.org/1999/xhtml"` en `<urlset>`.

**Editar** `supabase/functions/generate-robots-txt/index.ts`:
- Resolver host desde `?host=` o `x-forwarded-host` y emitir el `Sitemap:` apuntando al dominio correcto: `https://<host>/sitemap.xml` (que a su vez se reescribe vía `_redirects`/proxy de Lovable a la edge function — actualmente ya hay redirección desde `/sitemap.xml`).
- Añadir línea `Host: <host>` (norma extendida que algunos crawlers respetan).

**Editar** `public/robots.txt`:
- Quedará como fallback estático genérico; añadir comentario indicando que el robots dinámico (edge function) provee el sitemap por dominio.
- Listar todos los sitemaps de los dominios conocidos (uno por línea):
  ```
  Sitemap: https://waxapp.mx/sitemap.xml
  Sitemap: https://vapewax.com.mx/sitemap.xml
  Sitemap: https://extraccionwax.com/sitemap.xml
  ```

---

### Archivos creados
- `src/components/admin/DomainsOverviewSection.tsx`

### Archivos editados
- `src/config/siteConfig.ts` (añade `hreflang` y export `HREFLANG_ALTERNATES`)
- `src/hooks/useSeoMeta.ts` (inyectar `<link rel="alternate" hreflang>`)
- `src/components/admin/AdminSidebar.tsx`, `src/pages/Admin.tsx` (entrada "Dominios")
- `supabase/functions/generate-sitemap/index.ts` (host-aware + xhtml:link alternates)
- `supabase/functions/generate-robots-txt/index.ts` (host-aware Sitemap:)
- `public/robots.txt` (lista los sitemaps de cada dominio)

### Sin cambios
- DB: la columna `orders.origin_domain` ya existe (creada en el plan anterior).
- No se requieren nuevos secrets ni migraciones.

### Notas
- El admin "Dominios" lee directo de `orders` con la RLS existente (admin/mod) — nada nuevo del lado de seguridad.
- hreflang declarado tanto en `<head>` (SPA) como en `sitemap.xml` (refuerzo para crawlers que cachean).
- Si en el futuro se añade un dominio a `siteConfig.ts`, automáticamente aparece en hreflang, sitemap alternates y robots fallback.

## Plan: Sistema Multi-Dominio (White Label) + Caché de Recomendaciones

Transformar la plataforma en un sistema multi-dominio donde el mismo código sirve a varios dominios con identidad visual y SEO distintos, compartiendo inventario. Además, cachear las recomendaciones del carrito.

---

### 1. Configuración central de sitios

**Crear** `src/config/siteConfig.ts`:
- Mapa `hostname → SiteIdentity` con: `key`, `siteName`, `logoUrl`, `faviconUrl`, `seoTitle`, `seoDescription`, `colors { primary, secondary, accent, background, foreground }` (en HSL), `ogImage`, `canonicalBase` (ej. `https://vapewax.com.mx`), `seoVariant` ('A' | 'B') para reescritura anti-duplicado.
- Entradas iniciales: `vapewax.com.mx`, `waxapp.mx`, `localhost` (fallback dev), `default`.
- Helper `getSiteByHost(hostname: string): SiteIdentity` con fallback al `default`.

**Crear** `src/hooks/useCurrentSite.ts`:
- Detecta `window.location.hostname` (o `import.meta.env` en SSR-safe guard) y devuelve la identidad activa memoizada.
- Expone también `canonicalUrl(pathname)` que concatena `canonicalBase + pathname`.

### 2. Tematización dinámica vía CSS variables

**Editar** `src/components/ThemeProvider.tsx`:
- Antes (o en paralelo) de cargar `theme_settings` desde Supabase, aplicar las variables CSS del `siteConfig` actual a `document.documentElement` (`--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--ring`).
- Establecer `<title>`, `<link rel="icon">` y meta description desde `siteConfig` si no hay valor de Supabase.
- El `siteConfig` tiene prioridad sobre `theme_settings` cuando el host coincide con un dominio definido (white-label estricto); para dominios no listados se conserva el comportamiento actual.

**Tailwind**: ya consume tokens HSL (`hsl(var(--primary))`), no requiere cambios estructurales — solo asegurar que cualquier color hardcodeado en `AgeGate.tsx` y `CartDrawer.tsx` use tokens semánticos (auditar y reemplazar si encontramos `text-white`, `bg-black`, etc.).

### 3. SEO dinámico y anti-duplicado

**Editar** `src/hooks/useSeoMeta.ts`:
- Inyectar `<link rel="canonical" href={canonicalUrl(location.pathname)}>` en cada navegación.
- Usar `siteName`, `seoTitle` y `ogImage` del `siteConfig` como overrides por defecto.
- Inyectar `<meta property="og:url">` con la canonical.

**Crear** `src/lib/seoVariant.ts`:
- Función `rewriteDescription(text: string, variant: 'A' | 'B'): string` que para variant B:
  - Añade prefijo/sufijo único (ej. `"Disponible en [SiteName]: …"` y `"— Envío express a todo México."`).
  - Reordena oraciones (split por `.`, intercala primera ↔ segunda).
  - Sustituye sinónimos seguros (`"premium" ↔ "de alta gama"`, `"comprar" ↔ "adquirir"`) vía mapa.
- Aplicarla en `ProductDetail.tsx` al renderizar la descripción y en JSON-LD.

### 4. Tracking de origen en ventas

**Migración DB**:
- `ALTER TABLE public.orders ADD COLUMN origin_domain text;`
- Índice `CREATE INDEX idx_orders_origin_domain ON public.orders(origin_domain);`

**Editar** `supabase/functions/create-order/index.ts`:
- Aceptar `origin_domain` en el body (validar string, max 255).
- Persistir en el insert. Hacerlo obligatorio: si falta, devolver 400.

**Editar** `src/pages/Checkout.tsx`:
- Enviar `origin_domain: window.location.hostname` al invocar `create-order`.

**Editar** `src/components/admin/OrdersSection.tsx`:
- Añadir filtro select "Dominio de origen" (poblado con `distinct origin_domain` desde la query) y aplicarlo al listado.

### 5. Pruebas E2E Playwright

**Crear** `playwright-tests/multi-domain.spec.ts`:
- Test 1: navegar a la app interceptando `window.location.hostname` (vía `page.addInitScript` que parchea `Object.defineProperty(window.location, 'hostname', …)` o usando `--host-rules` con un dominio secundario configurado en `playwright.config.ts`).
- Verificar que el `<img alt>` del logo y `getComputedStyle(document.documentElement).getPropertyValue('--primary')` corresponden al dominio secundario.
- Test 2: completar un checkout end-to-end y consultar Supabase (vía cliente service-role en el spec) para validar `orders.origin_domain === 'dominio-secundario.test'`.

### 6. Caché de recomendaciones del carrito

**Editar** `src/components/cart/EmptyCartRecommendations.tsx`:
- Usar `@tanstack/react-query` (`useQuery` con `queryKey: ['cart-recommendations']`, `staleTime: 5 * 60 * 1000`, `gcTime: 30 * 60 * 1000`).
- Eliminar el manejo manual de `loading/error/items` y derivarlos de `useQuery` (mantiene los estados Skeleton + Error con botón Reintentar = `refetch()`).
- Resultado: la primera apertura del Drawer consulta Supabase; las siguientes (durante 5 min) se sirven de caché en memoria sin red.

---

### Archivos creados
- `src/config/siteConfig.ts`
- `src/hooks/useCurrentSite.ts`
- `src/lib/seoVariant.ts`
- `playwright-tests/multi-domain.spec.ts`

### Archivos editados
- `src/components/ThemeProvider.tsx`
- `src/hooks/useSeoMeta.ts`
- `src/pages/ProductDetail.tsx`
- `src/pages/Checkout.tsx`
- `src/components/admin/OrdersSection.tsx`
- `src/components/cart/EmptyCartRecommendations.tsx`
- `supabase/functions/create-order/index.ts`

### Migración DB
- `orders.origin_domain` (text, indexado)

### Notas
- No se rompe el flujo actual: dominios no listados en `siteConfig` reciben la identidad `default` (waxapp).
- El `seoVariant` es determinista por dominio para que Google vea contenido estable en cada uno.
- Edge Function `create-order` ya valida inputs; sólo añadimos un campo más.

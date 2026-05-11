# Plan de reingeniería WAXAPP

## 1. Corrección de routing de productos

**Archivos:** `src/components/ProductCard.tsx`, `src/components/ProductGrid.tsx`, `src/components/FeaturedCarousel.tsx`, `src/components/QuickViewDialog.tsx`, `src/pages/ProductDetail.tsx`.

- Auditar todos los `Link`/`navigate` que apunten a productos y unificar a `/producto/:id`.
- En `ProductCard.tsx`: la tarjeta ya envuelve el contenido en `<Link>`, pero el botón "Agregar" y "Vista rápida" rompen el área clickeable. Consolidar todo en un solo `<Link>` exterior y mover los botones a posición absoluta con `stopPropagation`, garantizando que cualquier zona del card navega al detalle.
- Si el id usado contiene clave compuesta (`id::variant`), en `ProductDetail.tsx` parsear con `id.split('::')[0]` antes de buscar el producto y preseleccionar la variante si viene en la segunda parte. Fallback a búsqueda por slug/nombre si no hay match en `products` para evitar 404.
- Redirigir cualquier `/shop/:id` o `/tienda/:id` legacy a `/producto/:id` en `App.tsx`.

## 2. Autenticación multi-modal

**Archivos:** `src/pages/ClientAuth.tsx` (rediseño), `src/integrations/lovable/index.ts` (ya existe).

- Rediseñar `ClientAuth` con `Tabs` (shadcn) bajo el título **"Elige tu forma de entrar"**:
  - **Email + contraseña** (signup/login tradicional con `supabase.auth.signInWithPassword` / `signUp`).
  - **Magic Link** (`supabase.auth.signInWithOtp` con `emailRedirectTo: window.location.origin + '/mi-cuenta'`).
  - **Google** (ya existe vía `lovable.auth.signInWithOAuth('google')`).
  - **Apple** vía `lovable.auth.signInWithOAuth('apple')` — habilitar provider con `configure_social_auth`.
  - **GitHub:** no es soportado en Lovable Cloud nativamente. Se omite con nota al usuario en el plan (ver más abajo). Si insiste se requeriría conectar Supabase externo.
- Estilo Dark Mode Tech: tabs con borde neón verde activo, botones OAuth con icono y borde sutil.

## 3. Home Inventory-First

**Archivos:** `src/components/ProductGrid.tsx`, `src/components/ProductCard.tsx`.

- En `ProductGrid`: tras cargar productos+stock desde Supabase, hacer `.sort((a,b) => (b.inStock?1:0) - (a.inStock?1:0))` para empujar agotados al final (preservando orden interno).
- Reorganizar `ProductCard` en este orden visual:
  1. Imagen + badge superior izquierdo: **"En Stock"** (verde neón) o **"Agotado"** (rojo).
  2. Línea de **disponibilidad inmediata** ("Envío hoy" en ámbar) cuando `stock > 0`.
  3. Categoría + Nombre.
  4. Precio (con tachado si oferta).
  5. Descripción truncada `line-clamp-2`.
  6. Botón CTA.

## 4. Portal de Afiliados público `/afiliados`

**Archivos nuevos:** `src/pages/AfiliadosLanding.tsx`. **Editar:** `src/App.tsx`, `src/components/Footer.tsx` (link).

- Landing pública con secciones:
  - Hero: "Gana 15% por cada venta" + CTA "Unirse al programa" → `/portal-vendedores/login` (registro existente).
  - Beneficios (3 cards): comisión 15%, pagos rápidos, panel propio con métricas.
  - Cómo funciona (pasos 1-2-3 usando `?ref=`).
  - FAQ (`Accordion` shadcn) sobre tracking, cookies, pagos, links `?ref`.
  - CTA final.
- Registrar ruta `/afiliados` en `App.tsx` antes del catch-all.

## 5. Rendimiento

- `line-clamp-2` ya disponible vía Tailwind; aplicarlo consistentemente en `ProductCard` y `FeaturedCarousel`.
- Confirmar `loading="lazy"` en imágenes del grid (ya está en ProductCard).
- Sin cambios de bundle adicionales.

## Notas técnicas

- **GitHub OAuth:** Lovable Cloud no lo soporta nativamente. En el UI se omitirá; si lo necesitas explícitamente requiere migrar a Supabase externo — confirma si quieres que lo plantee o lo dejamos fuera.
- **Apple:** se habilitará vía `configure_social_auth(['google','apple'])`.
- Sin cambios de DB; sin nuevos secrets.

## Archivos

- **Crear:** `src/pages/AfiliadosLanding.tsx`
- **Editar:** `src/App.tsx`, `src/pages/ClientAuth.tsx`, `src/pages/ProductDetail.tsx`, `src/components/ProductCard.tsx`, `src/components/ProductGrid.tsx`, `src/components/Footer.tsx`

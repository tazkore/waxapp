## Plan: Multimedia + Tienda + Marcas + Más Integraciones

Trabajo grande dividido en 6 bloques. Todo conectado vía la biblioteca de Multimedia, productos, variantes, marcas e integraciones.

---

### 1. Optimización de imágenes (Multimedia)
- Comprimir/redimensionar en el navegador antes de subir usando `browser-image-compression` (max 1600px lado mayor, calidad 0.82, formato WebP cuando sea posible).
- Generar **2 versiones** por imagen subida: `original` y `thumb` (400px) en la misma carpeta (`<folder>/<ts>-name.webp` y `<folder>/<ts>-name-thumb.webp`).
- Ajustar `MediaSection.tsx` para mostrar el `thumb` en la grilla (carga rápida) y copiar la URL `original` por defecto, con opción "Copiar miniatura".
- Añadir indicador de tamaño antes/después y barra de progreso por archivo.

### 2. Galería selector reutilizable + integración con Inventario
- Nuevo componente `MediaPickerDialog` (modal) con búsqueda, filtro por carpeta (productos/branding/banners/marcas/otros) y selección única.
- En `InventorySection.tsx`, en el formulario de producto agregar campo **Imagen** con tres botones:
  - **Subir imagen** (file input → sube a `media/products/` con compresión y autoselecciona).
  - **Seleccionar de galería** (abre `MediaPickerDialog`).
  - **Quitar imagen**.
  - Preview en miniatura con botón **Editar/Cambiar**.
- Mismo control replicado en cada fila de **Variantes** (nueva columna `image_url`).
- Migración: `ALTER TABLE product_variants ADD COLUMN image_url text;`.
- Actualizar `ProductCard` y `ProductDetail` para usar `product.image_url` real (fallback al placeholder actual).

### 3. Multimedia: nueva carpeta "marcas" y selector mejorado
- Añadir `brands` a las carpetas disponibles en `MediaSection`.
- Las imágenes subidas se guardan automáticamente en la carpeta seleccionada (ya funciona; se añaden los nuevos valores y un selector visual con conteos por carpeta).

### 4. Sección de Marcas (Backend + Frontend)
- **Migración** nueva tabla `brands`:
  - `id uuid PK`, `name text unique`, `slug text unique`, `logo_url text`, `description text`, `website text`, `is_featured bool default false`, `display_order int default 0`, `is_active bool default true`, timestamps.
  - RLS: lectura pública, escritura admin.
- **Migración** `ALTER TABLE products ADD COLUMN brand_id uuid REFERENCES brands(id);`.
- **Admin**: nueva sección `BrandsSection.tsx` (CRUD) en `AdminSidebar` + `Admin.tsx`. Incluye selector de logo desde `MediaPickerDialog`.
- **En el formulario de Producto** agregar dropdown **Marca**.
- **Frontend landing**: nueva sección `BrandsStrip.tsx` (carrusel de logos infinito tipo "as seen in") usando `brands` activas, insertado entre `TrustSignals` y `FeaturedCarousel`.
- **Tienda**: filtro adicional por marca en `ProductGrid`.

### 5. Carrusel premium de banners en landing
- Nuevo componente `PromoBanners.tsx` que lee imágenes de la carpeta `media/banners/` (vía `supabase.storage.list`) y opcionalmente metadatos desde una nueva tabla simple `banners` (`id, image_path, title, subtitle, cta_text, cta_url, is_active, display_order`).
- Migración `banners` con RLS pública lectura / admin escritura.
- Admin: pestaña **Banners** dentro de `MediaSection` (o sección aparte) para asignar título/CTA a cada imagen.
- Diseño: full-width, autoplay, parallax sutil, gradientes oscuros, CTA principal. Insertado debajo del `Hero`.

### 6. Quick View + Hover Zoom en Tienda
- `ProductCard`: agregar botón **Vista Rápida** (icono ojo) que abre `QuickViewDialog` con imagen grande, descripción, precio, selector de variante y "Agregar al carrito" sin salir de la tienda.
- Hover zoom: contenedor de imagen con `overflow-hidden` y `scale-110` + `translate` siguiendo el mouse (sin librerías extra).

### 7. Más integraciones (App Store)
Insertar (vía `INSERT INTO integrations`) nuevas apps disponibles para activar:
- **Mailchimp** (email marketing)
- **Meta Pixel / Conversions API** (analytics + ads)
- **Google Analytics 4** (analytics)
- **TikTok Pixel** (ads)
- **WhatsApp Business Cloud API** (mensajería)
- **MercadoLibre** (marketplace, refrescar config)
- **Shopify Sync** (marketplace)
- **Zapier Webhooks** (automation)
- **Slack Notifications** (ops)
- **Stripe** (pagos alternativo a Clip)
Para cada una se agrega un placeholder de configuración (campos en `config` jsonb) en `IntegrationsSection`. Las que requieren keys reales mostrarán un CTA "Configurar API key" que pedirá al usuario añadir el secreto correspondiente cuando decida activarlas.

### 8. Actualizar inventario con URLs reales
Tras crear el picker de galería, ejecutar `UPDATE` masivo en `products` para asignar `image_url` a los productos existentes mapeándolos por nombre con las imágenes ya subidas en `media/products/` (krt-horchata, boutiq-switch, elfthc-*, fume-*).

---

### Detalles técnicos
- Dependencia nueva: `browser-image-compression` (~12kb gz).
- Storage: se sigue usando el bucket público `media`. Añadir convención `brands/` para logos.
- RLS para nuevas tablas (`brands`, `banners`): SELECT público, INSERT/UPDATE/DELETE solo `admin`.
- Realtime: no se activa en estas tablas (sin PII).
- No se tocan archivos prohibidos (`client.ts`, `types.ts`, `.env`, `config.toml` project-level).

### Archivos nuevos
- `src/components/admin/MediaPickerDialog.tsx`
- `src/components/admin/BrandsSection.tsx`
- `src/components/QuickViewDialog.tsx`
- `src/components/PromoBanners.tsx`
- `src/components/BrandsStrip.tsx`
- `src/lib/imageOptimizer.ts`
- 2-3 migraciones SQL (variantes image_url, brands, banners + integraciones nuevas)

### Archivos editados
- `MediaSection.tsx`, `InventorySection.tsx`, `AdminSidebar.tsx`, `Admin.tsx`
- `ProductCard.tsx`, `ProductGrid.tsx`, `ProductDetail.tsx`, `Index.tsx`
- `IntegrationsSection.tsx`

### Resultado para el usuario
- Subidas más ligeras y rápidas, miniaturas instantáneas.
- En cada producto y variante: subir / cambiar / elegir de galería con un clic.
- Nueva sección **Marcas** en admin y tira de marcas en el home.
- Carrusel premium de banners gestionable desde admin.
- Vista rápida y zoom en la tienda usando las imágenes reales.
- 10 nuevas integraciones disponibles en el App Store.

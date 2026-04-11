
# Plan: Almacenes, Inventario Completo, Variantes, Envío y SEO Avanzado

## Problemas detectados

1. **Productos no editables**: `InventorySection` tiene `isAdmin={false}` por defecto, y `Admin.tsx` no pasa la prop. Los botones de editar/crear y los inputs inline están ocultos.

## Cambios planificados

### 1. Corregir edición de productos (Quick fix)
- En `Admin.tsx`, pasar `isAdmin={true}` (o usar el rol real) al renderizar `<InventorySection />`

### 2. Agregar variantes de productos
- **Migración**: Crear tabla `product_variants` con columnas: `id`, `product_id` (FK a products), `name` (ej. "30mg", "Mango"), `price`, `stock`, `sku`, `is_active`, timestamps
- RLS: mismas políticas que `products`
- **UI**: En el dialog de edición de producto, agregar sección de variantes con lista editable (nombre, precio, stock por variante)

### 3. Módulo de Almacenes
- **Migración**: Crear tabla `warehouses` con: `id`, `name`, `address`, `city`, `state`, `is_active`, timestamps
- Agregar columna `warehouse_id` (nullable FK) a `products` para asignar productos a almacenes
- RLS: admin/mod lectura, admin escritura
- **UI**: Crear `WarehousesSection.tsx` con CRUD de almacenes y asignación de almacén en el formulario de producto
- **Sidebar**: Agregar entrada "Almacenes" con icono `Warehouse`

### 4. Conexión con empresas de guías de envío
- **UI**: En `OrdersSection`, agregar sección/tab para configurar proveedores de guías (Skydropx, Envia.com, etc.)
- Crear tabla `shipping_providers` con: `id`, `name`, `slug`, `api_key_ref`, `is_active`, `config` (jsonb)
- En el detalle de pedido, agregar botón "Generar Guía" que invoque una Edge Function para crear guía con el proveedor configurado
- Inicialmente se dejará preparada la infraestructura para conectar vía API key (similar al patrón de integraciones existente)

### 5. SEO avanzado para indexación completa
- **Generación automática de sitemap.xml**: Crear Edge Function `generate-sitemap` que lea `seo_pages` y genere XML dinámico
- **Mejoras al módulo SEO existente**:
  - Agregar botón "Crear Página" para registrar nuevas rutas en `seo_pages`
  - Schema markup (JSON-LD) para productos — inyectar structured data en las páginas de producto
  - Agregar campo `canonical_url` a `seo_pages`
- **robots.txt dinámico**: Actualizar para incluir referencia al sitemap
- **Componente JSON-LD**: Crear componente que inyecte structured data de producto (Product schema) en las páginas de detalle

### Archivos a crear/editar

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/...` | 3 migraciones (variantes, almacenes, shipping_providers) |
| `src/pages/Admin.tsx` | Pasar isAdmin, agregar warehouses route |
| `src/components/admin/InventorySection.tsx` | Agregar variantes UI, selector almacén |
| `src/components/admin/WarehousesSection.tsx` | Nuevo — CRUD almacenes |
| `src/components/admin/AdminSidebar.tsx` | Agregar Almacenes y Envíos |
| `src/components/admin/ShippingSection.tsx` | Nuevo — gestión proveedores de guías |
| `src/components/admin/SeoSection.tsx` | Agregar crear página, canonical |
| `supabase/functions/generate-sitemap/index.ts` | Nuevo — sitemap XML dinámico |
| `src/components/ProductJsonLd.tsx` | Nuevo — structured data para productos |
| `src/pages/ProductDetail.tsx` | Integrar JSON-LD |

### Orden de ejecución
1. Migraciones de base de datos (variantes, almacenes, shipping_providers)
2. Fix isAdmin en Admin.tsx
3. UI de variantes en InventorySection
4. WarehousesSection + sidebar
5. ShippingSection + sidebar
6. SEO avanzado (sitemap, JSON-LD, crear página)

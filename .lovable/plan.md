## Reestructuración del panel admin + Configuración general

### 1. Sidebar por grupos colapsables

Reescribir `AdminSidebar.tsx` para mostrar **grupos** (cada uno con `SidebarGroupLabel` clicable + chevron, igual que el grupo "Tiendas") y mover cada sección a su grupo. Las claves (`key`) de las secciones existentes **no cambian** para no romper el switch en `Admin.tsx`.

Estructura propuesta:

```text
Principal
  · Inicio              (overview)
  · Estadísticas        (overview, mismo destino por ahora — placeholder hasta tener un módulo aparte)

Gestión
  · Pedidos             (orders)
  · Envíos & Paqueterías (shipping)
  · Clientes & CRM      (clients)
  · Pagos               (payments)
  · Pasarelas de Pago   (payment-gateways)   ← NUEVO link directo al tab gateways de PaymentsSection
  · Compras & B2B       (purchasing)
  · Centro de Operaciones (operations)

Catálogo
  · Productos           (products)
  · Inventario          (inventory)
  · Almacenes           (warehouses)
  · Marcas              (brands)
  · Multimedia          (media)
  · Banners Home        (banners)
  · Blog                (blog)

Canales de venta
  · Canales             (channels)            ← NUEVA placeholder section
  · Amazon Seller       (amazon)

Potenciar
  · Hub Marketing       (marketing)
  · Marketing & Cupones (marketing-coupons)   ← link a tab de cupones
  · SEO & Indexación    (seo)

Apps & Integraciones
  · Aplicaciones        (apps)                ← NUEVA (lista de apps instaladas)
  · Integraciones       (integrations)
  · Chatbot IA          (chatbot)

Configuración
  · Tema                (theme)
  · Dominios            (domains)
  · Staff & Usuarios    (staff)
  · API & Conexiones    (api-keys)
  · Conexiones de Entorno (env-connections)
  · Auditoría de Acceso (access-audit)
  · Setup Inicial       (setup)
  · Importar Sitio      (importer)
  · Previsualizar Importados (imported-preview)
  · Importar Tema (IA)  (theme-importer)
  · Configuración general (settings)          ← entra a la nueva SettingsSection con tabs
```

Cada grupo se renderiza con:
- estado local `openGroups: Record<string, boolean>` (todos abiertos por defecto)
- `SidebarGroupLabel` con onClick + chevron rotado
- `adminOnly` se mantiene por item

### 2. Módulo de Configuración (rehecho)

Reescribir `SettingsSection.tsx` con un layout de **tabs verticales** (sub-nav lateral interno) tipo Tiendanube:

```text
Resumen                  → SettingsResumen.tsx (cards atajo a cada sub-sección + estado de checklist)
Pagos y envíos
  · Métodos de pago      → reusa <PaymentsSection /> filtrado a tab "gateways"
  · Medios de envío      → reusa <ShippingSection /> en modo settings (read-only links)
  · Centros de distribución → reusa <WarehousesSection />
Comunicación
  · Información de contacto  → SettingsContact (form: razón social, RFC, email, teléfono, dirección, redes sociales)
  · Botón de WhatsApp        → SettingsWhatsApp (número, mensaje predeterminado, mostrar en mobile/desktop, posición)
  · E-mails automáticos      → SettingsEmails (lista de plantillas: bienvenida, pedido confirmado, envío, recuperación; toggle activo + asunto + cuerpo HTML)
Checkout
  · Opciones del checkout    → SettingsCheckoutOptions (campos requeridos, permitir invitado, mínimo de compra, requiere RFC, edad mínima, captura nacimiento, etc.)
  · Mensajes para clientes   → SettingsCheckoutMessages (mensaje header, footer, página gracias, política devoluciones)
Otros
  · Usuarios y notificaciones → reusa <StaffSection /> + tabla de notificaciones admin
  · Dominios                  → reusa <DomainsSection />
  · Códigos externos          → SettingsExternalCodes (head HTML, body HTML, GA4, Meta Pixel, GTM, hotjar, JSON con varios scripts)
  · Idiomas y monedas         → SettingsLocale (idioma default, moneda default, lista de monedas activas + tasas)
  · Redireccionamientos 301   → SettingsRedirects (CRUD sobre tabla `seo_redirects` ya existente)
  · Campos personalizados     → SettingsCustomFields (CRUD: clave, label, tipo [text/number/select/date/checkbox], aplicable a [producto/cliente/pedido], opciones, requerido)
```

UI: panel izquierdo con grupos+items, panel derecho con el componente activo. URL hash `#settings/contacto` para deep-link (estado local sincronizado con `window.location.hash`).

### 3. Persistencia — nuevas tablas

```sql
-- Almacén llave/valor de configuración global (un solo proyecto)
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.site_settings enable row level security;
create policy "Admin manage site_settings" on public.site_settings for all
  using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'super_admin'))
  with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'super_admin'));
create policy "Public read site_settings" on public.site_settings for select using (true);
```

Llaves usadas: `contact`, `whatsapp`, `checkout_options`, `checkout_messages`, `external_codes`, `locale`, `seo_global`.

```sql
-- Plantillas de e-mail editables
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,        -- welcome, order_confirmed, order_shipped, password_recovery
  name text not null,
  subject text not null,
  body_html text not null,
  is_active boolean not null default true,
  variables jsonb not null default '[]'::jsonb,  -- ['{{customer_name}}','{{order_number}}']
  updated_at timestamptz not null default now()
);
-- RLS: admin manage, public none
```

```sql
-- Campos personalizados extensibles
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  type text not null check (type in ('text','number','select','date','checkbox','textarea')),
  applies_to text not null check (applies_to in ('product','client','order')),
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  display_order int not null default 0,
  is_active boolean not null default true,
  unique(key, applies_to)
);
-- RLS: admin manage; public read active
```

`seo_redirects` ya existe → reusar.

### 4. Nuevas secciones placeholder/wrapper

- `AppsSection.tsx` — tarjetas con apps instaladas (lee `integrations` con `is_installed=true`) + acceso al hub.
- `ChannelsSection.tsx` — tarjetas para Tienda online, Amazon, Mercado Libre (preview / link a hub).
- `PaymentGatewaysShortcut` — entrada del sidebar que abre `payments` con `?tab=gateways` (vía estado en Admin).

### 5. Cambios técnicos puntuales

- `Admin.tsx`: añadir cases para `apps`, `channels`, `payment-gateways` (mismo render que `payments` con tab forzado), `marketing-coupons` (`marketing` con tab cupones), `overview` para "stats".
- `SettingsSection.tsx`: tipo `subPage` y mapa a componente; lectura/escritura via helper `getSetting(key)` / `setSetting(key, value)` que usa `site_settings`.
- Mantener `adminOnly` para grupos sensibles. El grupo "Apps & Integraciones" y "Configuración" son adminOnly enteros.

### 6. Ítems entregables (archivos)

Nuevos:
- `src/components/admin/AppsSection.tsx`
- `src/components/admin/ChannelsSection.tsx`
- `src/components/admin/settings/SettingsLayout.tsx` (sidebar interno + router de subpáginas)
- `src/components/admin/settings/SettingsResumen.tsx`
- `src/components/admin/settings/SettingsContact.tsx`
- `src/components/admin/settings/SettingsWhatsApp.tsx`
- `src/components/admin/settings/SettingsEmails.tsx`
- `src/components/admin/settings/SettingsCheckoutOptions.tsx`
- `src/components/admin/settings/SettingsCheckoutMessages.tsx`
- `src/components/admin/settings/SettingsExternalCodes.tsx`
- `src/components/admin/settings/SettingsLocale.tsx`
- `src/components/admin/settings/SettingsRedirects.tsx`
- `src/components/admin/settings/SettingsCustomFields.tsx`
- `src/lib/siteSettings.ts` (helpers get/set)
- migración SQL (site_settings, email_templates, custom_fields)

Modificados:
- `src/components/admin/AdminSidebar.tsx` — grupos colapsables
- `src/components/admin/SettingsSection.tsx` — usa SettingsLayout
- `src/pages/Admin.tsx` — nuevos cases + soporte para deep-link a tab dentro de PaymentsSection/MarketingSection (via prop `defaultTab`)
- `src/components/admin/PaymentsSection.tsx` — aceptar `defaultTab`
- `src/components/admin/MarketingSection.tsx` — aceptar `defaultTab`

### Notas
- No se eliminan secciones existentes; solo se reagrupan y se le dan accesos adicionales.
- Las nuevas secciones de Settings funcionan en modo "guardar/cargar" contra `site_settings` (jsonb por llave). Nada se rompe si la tabla está vacía: cada sub-form muestra placeholders.
- Mantengo el patrón actual (un solo `Admin.tsx` con switch) en vez de migrar a rutas anidadas para minimizar cambios.

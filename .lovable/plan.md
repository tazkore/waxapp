## Hub de Integraciones (App Store) — Plan de implementación

El proyecto ya tiene una sección `Integraciones` (`IntegrationsSection.tsx`) respaldada por la tabla `integrations` con install/active, modal de API keys, búsqueda y tabs por estado. La vamos a transformar en un verdadero **App Store estilo Tiendanube/Shopify**, con tabs por categoría funcional, tarjetas más visuales, modal de "Conectar" tipo wizard y gating condicional en el resto del panel.

### 1. Catálogo curado de apps

Insertar (vía migration con `ON CONFLICT (slug) DO NOTHING`) las apps faltantes en `public.integrations`:

| Slug | Nombre | Categoría | Campos requeridos |
|---|---|---|---|
| skydropx | Skydropx | envios | api_key |
| t1envios | T1 Envíos | envios | api_key |
| ml_envios | Mercado Envíos | envios | access_token |
| facturama | Facturama CFDI 4.0 | facturacion | api_user, api_password |
| factura_com | Factura.com | facturacion | api_key, secret_key |
| meta_pixel | Meta Pixel | marketing | pixel_id |
| google_ads | Google Ads Conversion | marketing | conversion_id, label |
| tiktok_pixel | TikTok Pixel | marketing | pixel_id |
| klaviyo | Klaviyo | marketing | api_key |
| whatsapp_api | WhatsApp Business API | soporte | phone_number_id, access_token |
| zendesk | Zendesk | soporte | subdomain, api_token |
| crisp | Crisp Chat | soporte | website_id |

Se agregan dos categorías nuevas (`envios`, `facturacion`, `soporte`) al mapa `categoryLabels`/`categoryIcons` con iconos Lucide (`Truck`, `FileText`, `Headphones`).

### 2. Rediseño de `IntegrationsSection.tsx` — vista App Store

- Reemplazar los tabs actuales (Instaladas / Store / Todas) por **tabs por categoría**: `Todas · Envíos · Marketing · Facturación · Servicio al Cliente · Pagos · Otros` con contadores.
- Mantener búsqueda arriba.
- **Tarjetas (`AppCard`)** con look Dark Mode Tech:
  - Fondo `bg-[#1A1A1A]` / `border-border`, hover `border-primary/40`.
  - Icono 48×48 a la izquierda con halo `shadow-[0_0_20px_rgba(0,230,118,0.15)]` cuando `is_active`.
  - Nombre + descripción en 2 líneas.
  - **Badge de estado** en esquina:
    - Activo → punto verde `#00E676` con `animate-pulse` + texto "Activo".
    - Instalada pero inactiva → "Inactivo" gris.
    - No instalada → "Desconectado" outline.
  - Botón principal contextual: `Instalar` (no instalada) / `Configurar` (instalada).
- Grid responsivo `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

### 3. Modal "Conectar [App]" — wizard de credenciales

Nuevo componente `ConnectAppDialog.tsx` (sustituye al modal actual cuando la app aún no tiene credenciales; el modal existente queda para gestión avanzada).

Layout limpio:
- Header: icono + "Conectar Skydropx".
- Subtítulo: "Pega aquí tus credenciales de producción para habilitar la sincronización".
- Inputs dinámicos según `requiredFields` definidos por slug (catalogo en `src/lib/integrationsCatalog.ts`).
- Link "¿Dónde encuentro estas claves?" → `api_docs_url`.
- Botones:
  - `Cancelar` (ghost).
  - `Probar Conexión y Guardar` — primary verde `#00E676`, hover `bg-primary/90 shadow-[0_0_20px_rgba(0,230,118,0.4)]`.
- Flujo del botón:
  1. Llama a Edge Function `test-integration-connection` (nueva) con `{ slug, credentials }`.
  2. Si OK → guarda `config.api_keys`, `is_installed=true`, `is_active=true`, toast verde.
  3. Si falla → muestra error inline en rojo, no guarda.

### 4. Edge function `test-integration-connection`

Endpoint único que enruta por `slug`:
- `skydropx` → `GET https://api.skydropx.com/v1/account` con `Authorization: Token token=...`.
- `facturama` → `GET https://api.factura.com/v4/clients` con basic auth.
- `meta_pixel` → solo valida formato `^\d{15,16}$`.
- `whatsapp_api` → `GET https://graph.facebook.com/v18.0/{phone_number_id}` con bearer.
- Default → valida que los campos requeridos no estén vacíos.

Devuelve `{ ok: boolean, message: string }`.

### 5. Hook global `useInstalledIntegrations`

Nuevo `src/hooks/useInstalledIntegrations.ts`:

```ts
export function useIntegrationActive(slug: string): boolean
export function useInstalledIntegrations(): { bySlug: Record<string, Integration>, loading }
```

Carga una vez desde `integrations` y se suscribe a cambios. Permite gating condicional en cualquier componente.

### 6. Gating condicional en el panel

Aplicar el hook donde corresponda:

- **`OrdersSection.tsx`** (línea ~417): el `<GenerateLabelButton>` solo se renderiza si `useIntegrationActive('skydropx') || useIntegrationActive('t1envios')`. Si ninguno está activo, mostrar tooltip "Instala Skydropx en Integraciones para generar guías" con link al hub.
- **`OverviewSection`**: mostrar tarjetas de "Marketing" (Meta Pixel events) solo si `meta_pixel` activo.
- **Checkout / `index.html`**: inyectar el snippet de Meta Pixel solo si está activo (lectura desde tabla en `App.tsx` con efecto montado).
- **`OrdersSection`** factura PDF button → solo si `facturama` o `factura_com` activos.
- **`ChatbotWidget`** → si `crisp` activo, montar el script de Crisp en su lugar.

### 7. Marca y estética

- Mantener fondo `#0A0A0A`, acentos `#00E676`, tipografía Space Grotesk para títulos / Inter para cuerpo (ya en proyecto).
- Punto verde activo: `<span className="h-2 w-2 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_8px_#00E676]" />`.
- Botones primary con `transition-shadow hover:shadow-[0_0_20px_rgba(0,230,118,0.4)]`.

### Archivos a crear / editar

**Nuevos**
- `src/components/admin/integrations/ConnectAppDialog.tsx`
- `src/components/admin/integrations/AppStoreCard.tsx`
- `src/lib/integrationsCatalog.ts` — slug → { requiredFields, displayCategory, ctaLabel }
- `src/hooks/useInstalledIntegrations.ts`
- `supabase/functions/test-integration-connection/index.ts`
- Migration: insert de las nuevas filas en `integrations` (idempotente)

**Editados**
- `src/components/admin/IntegrationsSection.tsx` — tabs por categoría, nuevo AppCard, abre `ConnectAppDialog` cuando no hay credenciales.
- `src/components/admin/OrdersSection.tsx` — gating del botón `Generar Guía`.
- `src/App.tsx` — montaje condicional de Meta Pixel / Crisp.
- `src/components/admin/AdminSidebar.tsx` — el item "Integraciones" ya existe, solo verificamos icono `Plug` y que esté visible para todos los roles admin.

### Detalles técnicos

- No tocar `src/integrations/supabase/types.ts` (auto-gen).
- La tabla `integrations` ya existe; solo INSERT idempotentes por `slug`.
- Las credenciales se almacenan en `integrations.config.api_keys` (patrón ya en uso). Para apps sensibles (Skydropx, WhatsApp), recomendar al usuario en el modal usar la sección "API & Conexiones" (super_admin) si quiere guardarlas como secrets de Edge Functions; por ahora se persisten en DB con RLS de admin.
- El edge function corre con `verify_jwt = true` (default) y usa `service_role` solo para leer `integrations`.
- Footer global con `<Copyright />` (`© WAXAPP.MX`) ya existe — se reutiliza, no se duplica.

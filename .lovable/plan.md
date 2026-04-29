## Objetivo

1. **Wizard de Onboarding**: añadir checkbox "No volver a mostrar en inicio" para descartar permanentemente.
2. **Sección "Dominios"**: nueva sección admin separada de Marcas, donde un dominio (ej. `cannesh.com`, `neshika.com`) es una entidad propia que se puede vincular a una marca y a una sub-tienda.
3. **Scraping aplicable a dominio + marca**: el importador puede dirigirse a un dominio registrado y crear/actualizar la marca y la sub-tienda asociada.
4. **Multi-proveedor de scraping**: además de Firecrawl, ofrecer **Jina AI Reader** y **ScrapingBee** como alternativas seleccionables.
5. **Verificar conectores**: agregar un botón "Probar todos" en `EnvironmentConnectionsSection` que valide credenciales (Firecrawl, Resend, Clip, Lovable AI, Amazon, Jina, ScrapingBee).

---

## Cambios

### 1. Wizard – "No volver a mostrar"

**Archivo**: `src/components/admin/OnboardingWizard.tsx`
- Añadir Checkbox en el footer: "No volver a mostrar al iniciar".
- Al cerrar con la opción activa: guardar `localStorage.setItem('wax_onboarding_dismissed', '1')` **y** marcar `theme_settings.onboarding_completed = true` (sin requerir terminar todos los pasos).

**Archivo**: `src/hooks/useOnboardingStatus.ts`
- Antes del fetch, leer `localStorage.getItem('wax_onboarding_dismissed')`. Si está activo → `needsOnboarding = false`.
- Exponer `resetDismiss()` para que el botón "Setup Inicial" del sidebar pueda reabrirlo manualmente.

### 2. Tabla `domains` y sección "Dominios"

**Migración nueva** `domains`:
```sql
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,        -- "cannesh.com"
  display_name text,
  brand_id uuid references public.brands(id) on delete set null,
  sub_store_id uuid references public.sub_stores(id) on delete set null,
  status text default 'pending',        -- pending | verified | active | offline
  ssl_status text default 'pending',
  is_primary boolean default false,
  notes text,
  last_scraped_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.domains enable row level security;
create policy "admins manage domains" on public.domains
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy "anyone reads active domains" on public.domains
  for select using (status = 'active');
```
RLS estricto: solo admins escriben.

**Componente nuevo** `src/components/admin/DomainsSection.tsx`:
- Listado tipo cards: hostname, marca asociada, sub-tienda asociada, estado, último scrape.
- CRUD con dialog (hostname, marca, sub-tienda, notas).
- Botón **"Importar desde este dominio"** que abre el flujo de scraping pre-rellenando la URL y vinculando los resultados a la marca/sub-tienda.
- Botón **"Configurar DNS"** que abre la guía oficial de Lovable (link, no DNS real).

**Sidebar**: añadir entrada `{ title: 'Dominios', icon: Globe, key: 'domains', adminOnly: true }` antes de "Marcas".
**Admin.tsx**: importar `DomainsSection` y registrar `case 'domains'`.

### 3. Marcas independientes del scraping

- En `BrandsSection` simplificar el Remix: queda solo como "duplicar tema". El scraping se mueve al flujo Dominios → Importar.
- `RemixBrandDialog` recibe opcionalmente un `domainId` para asociar la sub-tienda creada al dominio.

### 4. Scraping multi-proveedor

**Selector de proveedor** en `SiteImporterSection.tsx` y `ThemeImporterSection.tsx`:
```
[Firecrawl ▼] [Jina Reader] [ScrapingBee]
```
El componente envía `provider` en el body de la edge function.

**Edge functions** (modificar):
- `firecrawl-map`, `firecrawl-scrape-products`, `firecrawl-import-branding`, `firecrawl-import-theme`
- Añadir parámetro `provider: 'firecrawl' | 'jina' | 'scrapingbee'` (default firecrawl).
- Implementar fetcher unificado:
  - **Jina**: `GET https://r.jina.ai/{url}` con header `Authorization: Bearer ${JINA_API_KEY}` (opcional, funciona sin key con rate limit).
  - **ScrapingBee**: `GET https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url={url}&render_js=true`.
- Para **map** sin Firecrawl: usar el HTML scrapeado y extraer `<a href>` con un regex/cheerio-like (regex simple `/href=["']([^"']+)["']/g`) y filtrar mismo dominio.
- Para **branding/theme**: extraer `og:`, `theme-color`, `<link rel=icon>`, fuentes Google Fonts del HTML; luego pasar a Lovable AI Gateway (Gemini 2.5 Flash) para inferir colores HSL y tagline (ya existente).

**Secrets nuevos**: pedir al usuario `JINA_API_KEY` (opcional) y `SCRAPINGBEE_API_KEY` con `add_secret` solo si elige esos proveedores. Mostrar aviso en la UI antes de invocar.

### 5. Verificar conectores

**`EnvironmentConnectionsSection.tsx`**: agregar botón "Probar todos los conectores" que invoca una nueva edge function `check-connectors` y muestra una tabla con: Firecrawl, Resend, Clip, Lovable AI, Amazon SP-API, Jina, ScrapingBee → estado (✓/✗) + latencia + mensaje.

**Edge function nueva** `supabase/functions/check-connectors/index.ts`:
- Por cada proveedor: lee el secret correspondiente, hace una llamada ligera (ej. Firecrawl `/v2/credit/usage`, Resend `/domains`, ScrapingBee `/usage`, Jina `r.jina.ai/https://example.com`).
- Devuelve `[{name, ok, latency_ms, error?}]`.

---

## Detalles técnicos clave

```text
┌────────────────────┐         ┌──────────────────┐
│  DomainsSection    │ ──────▶ │  domains table    │
│  (CRUD + Importar) │         │  brand_id, sub_id │
└────────┬───────────┘         └──────────────────┘
         │ "Importar"
         ▼
┌─────────────────────────────────────────────────┐
│  SiteImporter (provider: firecrawl|jina|bee)    │
│  ─▶ edge fn ─▶ provider API ─▶ HTML/links      │
│            ─▶ Lovable AI (Gemini) ─▶ branding  │
└─────────────────────────────────────────────────┘
```

## Archivos afectados

| Tipo | Ruta |
|---|---|
| nuevo | `supabase/migrations/<ts>_domains.sql` |
| nuevo | `src/components/admin/DomainsSection.tsx` |
| nuevo | `supabase/functions/check-connectors/index.ts` |
| editar | `src/components/admin/OnboardingWizard.tsx` (checkbox no mostrar) |
| editar | `src/hooks/useOnboardingStatus.ts` (localStorage) |
| editar | `src/components/admin/AdminSidebar.tsx` (item Dominios) |
| editar | `src/pages/Admin.tsx` (case `domains`) |
| editar | `src/components/admin/SiteImporterSection.tsx` (selector proveedor + domainId) |
| editar | `src/components/admin/ThemeImporterSection.tsx` (selector proveedor) |
| editar | `src/components/admin/EnvironmentConnectionsSection.tsx` (botón probar todos) |
| editar | `src/components/admin/RemixBrandDialog.tsx` (acepta `domainId`) |
| editar | `supabase/functions/firecrawl-map/index.ts` (multi-provider) |
| editar | `supabase/functions/firecrawl-scrape-products/index.ts` (multi-provider) |
| editar | `supabase/functions/firecrawl-import-branding/index.ts` (multi-provider) |
| editar | `supabase/functions/firecrawl-import-theme/index.ts` (multi-provider) |

## Notas

- **No** se cambia el nombre de las funciones `firecrawl-*` para no romper invocaciones; internamente despachan al proveedor elegido.
- Los secrets `JINA_API_KEY` y `SCRAPINGBEE_API_KEY` se pedirán solo cuando el usuario elija esos proveedores por primera vez (con `add_secret`).
- La sección Dominios **no** maneja DNS real (eso vive en Project Settings → Domains de Lovable); solo registra y vincula con marcas/sub-tiendas para el scraping.

# Plan: E2E Testing, Affiliate Tracking & Loyalty Redemption

Aditivo: no se borra ni renombra ninguna ruta o tabla existente. Se reutiliza el módulo de Afiliados ya creado y la columna `loyalty_points` de `clients`.

## 1. Motor de tracking `?ref`

Hoy `src/pages/Index.tsx` ya guarda `waxapp_affiliate_ref` y dispara `track-affiliate-click`, pero solo en `/`. Lo movemos a nivel global:

- Crear `src/components/AffiliateRefTracker.tsx`: componente "headless" con `useEffect` + `useLocation` que escucha cambios de URL y persiste `?ref=CODE` en `localStorage` (con timestamp + TTL 30 días). Llama a `track-affiliate-click` solo la primera vez por código.
- Montarlo en `App.tsx` dentro de `<BrowserRouter>` junto a `<AgeGate />` para que funcione en `/`, `/tienda`, `/marcas`, `/s/:slug`, etc.
- Quitar el `useEffect` duplicado de `Index.tsx` (queda el global).
- En `Checkout.tsx` → `handleConfirm`, agregar al body de `create-order`:
  - `affiliate_code: localStorage.getItem('waxapp_affiliate_ref') ?? null`
- En la edge function `create-order`: aceptar `affiliate_code`, buscar en `affiliates` (status=approved) y guardar `affiliate_id` en la orden + insertar fila en `affiliate_sales` (pending). Esto cierra el loop de comisiones.

## 2. Redención de WAX Points en Checkout

Solo UI/lógica de presentación + cálculo del descuento; el descuento real lo validará el server más adelante.

- Cargar saldo real: `useEffect` que consulta `clients.loyalty_points where email = session.email` (fallback 0 si no existe). Mostrar saldo bajo el bloque de cupón en `OrderSummary` o en una nueva tarjeta dentro del paso 3 del checkout.
- Componente nuevo `src/components/LoyaltyRedeemCard.tsx`:
  - `Switch` "Usar mis WAX Points" (shadcn `switch.tsx`).
  - `Input` numérico con máximo = `min(saldo, totalAfterDiscount)` (1 punto = $1 MXN).
  - Botón "Aplicar máximo".
- Estado nuevo en `cartStore`: `loyaltyPointsApplied: number`, acciones `setLoyaltyPoints(n)` y `clearLoyaltyPoints()`. Recalcular `total()` restando puntos.
- Desglose en `OrderSummary`: añadir línea "Descuento puntos −$X" cuando aplique.
- Texto dinámico bajo el total: `"Acumularás +{Math.floor(total/10)} WAX Points con esta compra"`.
- En `handleConfirm` enviar `loyalty_points_used` al edge `create-order` (server descontará del saldo).

## 3. Dashboard `/admin/afiliados/dashboard`

Aprovechamos la `AffiliatesSection` existente y añadimos pestañas:

- Refactor `AffiliatesSection.tsx` con `Tabs`: **Solicitudes / Vendedores / Dashboard**.
- Tab Dashboard:
  - **Generador de links**: `Select` con afiliados aprobados → genera `https://waxapp.mx/tienda?ref={code}` con botón Copiar (`navigator.clipboard`).
  - **Date Range Picker** (shadcn `Calendar` + `Popover`, `mode="range"`, `pointer-events-auto`).
  - **Cards** (4): Clics totales, Ventas (count), Conversión %, Comisiones generadas $. Datos: agregaciones sobre `affiliate_clicks` y `affiliate_sales` filtrando por rango.
  - **Tabla rendimiento por vendedor**: ranking por ganancia con columnas Rango / Nombre / Link / Visitas / Ventas / Comisión.
- Sin nueva ruta — vive dentro del panel admin (`/admin` → sidebar "Afiliados"), ya que Admin es SPA single-route. El "deep link" `/admin/afiliados/dashboard` se resuelve con un parámetro `?section=affiliates&tab=dashboard` opcional.

## 4. Infraestructura E2E con Playwright

El proyecto ya tiene `playwright.config.ts` y `playwright-fixture.ts`. Solo falta la suite:

- Crear `playwright-tests/e2e.spec.ts` con 3 tests:
  1. **Public flow**: `goto /` → click "Tienda" → click primer `ProductCard` "Agregar" → abrir `CartDrawer` → click "Checkout" → assert URL `/checkout` o redirect a `/cliente`.
  2. **Affiliate flow**: `goto /?ref=TEST123` → assert `localStorage.waxapp_affiliate_ref === 'TEST123'` → navegar a `/tienda` → assert que persiste tras navegación SPA.
  3. **Admin flow**: `goto /admin/login` → llenar credenciales (vía `process.env.E2E_ADMIN_EMAIL/PASSWORD`) → assert que cargan métricas del Overview.
- Comentarios al inicio explicando: `npx playwright test` local, variables de entorno requeridas, `--ui` para modo interactivo.
- README rápido en `playwright-tests/README.md` con setup.

## Archivos

**Crear**: `src/components/AffiliateRefTracker.tsx`, `src/components/LoyaltyRedeemCard.tsx`, `playwright-tests/e2e.spec.ts`, `playwright-tests/README.md`.

**Editar**: `src/App.tsx`, `src/pages/Index.tsx` (limpiar), `src/pages/Checkout.tsx`, `src/components/OrderSummary.tsx`, `src/store/cartStore.ts`, `src/components/admin/AffiliatesSection.tsx`, `supabase/functions/create-order/index.ts`.

**Sin cambios de schema DB** (usamos columnas/tablas existentes). Si `create-order` necesita una columna `affiliate_id` en `orders` se añadirá vía migration en ese momento.

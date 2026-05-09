# Plan: Estabilidad + Lealtad + Afiliados

Mantengo Dark Mode Tech (#0A0A0A / #00E676 / #FFB300), Space Grotesk + Inter, y NO toco rutas existentes.

## 1. Age Gate global persistente

- Mover `<AgeGate />` de `Index.tsx` a `App.tsx`, **fuera de `<Routes>`** pero dentro de `BrowserRouter`, para que cubra `/tienda`, `/checkout`, `/orden-completada` y todas las rutas públicas.
- Excluir rutas administrativas (`/admin*`, `/cliente`, `/portal-vendedores`) y la página `/reset-password` mediante chequeo de `useLocation().pathname`.
- Persistencia: leer `localStorage.getItem('waxapp_age_verified') === 'true'` al montar; al hacer clic en "Tengo +18", `localStorage.setItem('waxapp_age_verified', 'true')` y ocultar.
- Limpiar el estado local de `Index.tsx` (ya no renderiza AgeGate).

## 2. Validación estricta de variantes (Carrito + Checkout)

- En `cartStore.ts`: helper `hasInvalidVariants()` que devuelve `true` si algún item con `product.variants?.length > 0` no tiene `selectedVariant`.
- En `Checkout.tsx`:
  - Calcular `invalid = useCartStore(s => s.hasInvalidVariants())`.
  - Si `invalid`, mostrar banner ámbar (`#FFB300`, `border-amber-500 bg-amber-500/10`) en el paso 3 con texto: *"Error: Hay productos en tu carrito sin una variante o sabor seleccionado. Por favor, edita tu carrito."* y un botón "Editar carrito" que abre el `CartDrawer`.
  - `disabled={invalid || loading}` en el botón "Pagar / Completar Orden".
- En `CartDrawer`: marcar la fila inválida con borde ámbar + ícono ⚠️ y CTA inline "Selecciona variante" que abre el `QuickViewDialog` correspondiente.
- Confirmar que la clave compuesta `${id}::${selectedVariant ?? ''}` ya se usa en el resto del flujo (ya verificado).

## 3. UI Fixes & Accesibilidad

- **QuickViewDialog – parsing de beneficios**: reemplazar el regex actual por:
  ```ts
  const benefitsList = (product.benefits ?? '')
    .split(/[,\n;•·]/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && /[a-záéíóúñ]/i.test(s))
    .slice(0, 5);
  ```
  Esto evita cortes por puntos dentro de palabras y descarta tokens vacíos/numéricos.
- **A11y CartDrawer & QuickViewDialog**:
  - Ambos ya usan `Sheet`/`Dialog` de shadcn (Radix) → focus trap y ESC ya activos por defecto, pero verificar que **no** se pase `onEscapeKeyDown={e => e.preventDefault()}` o `modal={false}`.
  - Añadir `aria-label="Cerrar carrito"` al botón X del `SheetContent` y `aria-label="Cerrar vista rápida"` en el `DialogContent`.
  - `aria-describedby` apuntando al título del producto en QuickView.
  - `role="alert"` en el banner ámbar de variantes inválidas.
  - Verificar que cada `RadioGroupItem` de variante tenga `aria-label` con el nombre.

## 4. Módulo Lealtad — WAX Points

**Backend (migración):**
- Tabla `wax_referrals` (`referrer_email`, `invitee_email`, `code`, `status`, `created_at`) — RLS: cliente solo ve los suyos por email; admin ve todo.
- La tabla `clients` ya tiene `loyalty_points`. Regla `1 pt por cada $10 MXN` ya implementada en trigger `on_order_confirmed` (verificado).
- Edge Function `award-referral-points`: al confirmar la primera orden de un invitee, suma 100 pts al referrer (idempotente por `wax_referrals.id`).

**Cliente `/mi-cuenta` (`ClientDashboard.tsx`):**
- Card "Mis WAX Points" con saldo actual (`loyalty_points`), tier, equivalencia ("≈ $X MXN de descuento").
- Botón "Generar link de invitación" → genera código `WAX-${userIdShort}`, guarda en `wax_referrals` (status `pending`) y copia `${origin}/tienda?ref=CODE` al portapapeles con `toast.success('Link copiado')`.
- Tabla mini de últimas 5 invitaciones con su estado.

**Admin `/admin/clientes` (`ClientsSection.tsx`):**
- Nueva columna "Puntos WAX" editable inline (input numérico + botón guardar) que hace `update clients set loyalty_points = X where id`. Solo `super_admin`/`admin`.
- Audit log opcional vía tabla `client_notifications` existente.

## 5. Módulo Afiliados / Vendedores

**Backend (migración):**
- Tabla `affiliates`: `user_id`, `code` (único), `status` ('pending'|'approved'|'rejected'), `commission_pct numeric default 15`, `total_clicks`, `total_sales`, `pending_payout numeric`.
- Tabla `affiliate_clicks`: `affiliate_id`, `landing_path`, `ip`, `ua`, `created_at`.
- Tabla `affiliate_sales`: `affiliate_id`, `order_id`, `gross`, `shipping`, `tax`, `net_profit`, `commission`, `status` ('pending'|'paid').
- RLS: el afiliado solo ve sus propios clicks/sales; admin ve todo.
- Edge Function `track-affiliate-click` (público) y `assign-affiliate-to-order` (server, llamada desde `create-order` cuando hay cookie/param `?ref=CODE`).

**Frontend ruta `/portal-vendedores`:**
- Login simulado independiente reutilizando `supabase.auth` pero con guard `requireRole('affiliate')` (rol agregado al enum `app_role` o tabla `user_roles` existente).
- Dashboard con:
  - Card "Mi link único": `${origin}/tienda?ref=${code}` + botón copiar.
  - 3 KPI cards: **Clics**, **Ventas cerradas**, **Comisiones por cobrar**.
  - Tabla "Mis Ventas Generadas" con columnas: Pedido | Total | Envío | Impuestos | **Utilidad Neta** | **Comisión 15%** | Estado. Fórmula visible en encabezado: `Utilidad = Total − Envío − Impuestos`, `Comisión = Utilidad × 15%`.

**Admin `/admin/afiliados` (nueva sección en `AdminSidebar`):**
- Tabla "Solicitudes" con botón Aprobar / Rechazar (cambia `status`).
- Tabla "Pagos pendientes" con `pending_payout` por afiliado y botón "Marcar como pagado" (mueve `affiliate_sales.status` a `paid`).

## Detalles técnicos

**Archivos a modificar:**
- `src/App.tsx` — montar AgeGate global con whitelist de rutas.
- `src/components/AgeGate.tsx` — añadir persistencia interna + `aria-modal`.
- `src/pages/Index.tsx` — quitar AgeGate local.
- `src/store/cartStore.ts` — `hasInvalidVariants()`.
- `src/pages/Checkout.tsx` — banner ámbar + disable.
- `src/components/CartDrawer.tsx` — fila inválida + a11y.
- `src/components/QuickViewDialog.tsx` — fix parsing + a11y.
- `src/pages/ClientDashboard.tsx` — card WAX Points + invitaciones.
- `src/components/admin/ClientsSection.tsx` — columna puntos editable.

**Archivos a crear:**
- `src/pages/AffiliatePortal.tsx`, `src/pages/AffiliateLogin.tsx`.
- `src/components/admin/AffiliatesSection.tsx`.
- Edge Functions: `award-referral-points`, `track-affiliate-click`, `assign-affiliate-to-order`.

**Migraciones SQL:** `wax_referrals`, `affiliates`, `affiliate_clicks`, `affiliate_sales` con RLS + rol `affiliate` en `app_role`.

**Sin cambios a:** sistema de diseño, Dark Mode tokens, rutas existentes, lógica de Clip/Resend, `create-order` (solo añade hook opcional al final).

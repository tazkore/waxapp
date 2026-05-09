# Plan: Cart UX, Retención y Panel de Afiliados v2

Trabajo incremental sobre 8 módulos. Mantenemos diseño Dark Mode Tech (#0A0A0A / #00E676), tokens semánticos HSL y la lógica `id::variante` ya existente en `cartStore`.

---

## 1. Estado global del carrito (bug del contador)

**Archivos:** `src/store/cartStore.ts`, `src/components/Navbar.tsx`

- `totalItems()` ya hace `reduce(qty)` — auditar Navbar para que use `useCartStore(s => s.totalItems())` (selector reactivo) en vez de `items.length`.
- Confirmar inmutabilidad en `removeItem`, `updateQuantity`, `clearCart` (todas usan `.filter`/`.map`, ✅).
- En el badge: ocultar burbuja si `count === 0` (`{count > 0 && <Badge>{count}</Badge>}`).

## 2. Drawer del carrito con shadcn `Sheet`

**Archivos:** `src/components/CartDrawer.tsx` (refactor)

- Reemplazar `motion.aside` actual por `<Sheet open={isOpen} onOpenChange={setCartOpen}>` + `<SheetContent side="right" className="w-full max-w-md flex flex-col p-0">`.
- Conserva animación nativa de Radix (slide-in-from-right) y accesibilidad (focus trap, ESC).
- **Estado vacío**: ícono `ShoppingBag` grande gris, título "Tu carrito está esperando", botón verde `bg-primary` "Explorar Productos" → `setCartOpen(false); navigate('/tienda')`.

## 3. Lista de productos + barra de envío + upsell

**Archivos:** `CartDrawer.tsx`, nuevo `src/components/cart/FreeShippingBar.tsx`, nuevo `src/components/cart/UpsellStrip.tsx`

- Items: ya tienen miniatura, nombre, variante en muted, precio, `[-][qty][+]` y papelera ✅ (mantener layout actual).
- **FreeShippingBar** (sticky top del drawer): usa `FREE_SHIPPING_THRESHOLD = 1500` ya exportado. `<Progress value={(subtotal/1500)*100} />` con texto dinámico:
  - `subtotal < 1500` → "Te faltan $X para Envío Gratis" (tono normal).
  - `subtotal >= 1500` → "¡Felicidades! Tienes Envío Gratis" + barra llena verde neón con glow.
- **UpsellStrip**: query Supabase `products` filtrando por categoría `accesorios` o `baterías`, `price < 300`, `limit 2`. Card mini horizontal con botón "+ Agregar" (`addItem`).

## 4. Banner top con countdown evergreen

**Archivos:** nuevo `src/components/PromoCountdownBanner.tsx`, integrar en `src/components/Navbar.tsx` o `App.tsx`

- Timer de 15 min persistido en `localStorage` (`wax_promo_deadline`). Si expira, reinicia a +15 min (evergreen).
- Render `MM:SS` en color `#FFB300` con animación `animate-pulse` cada segundo final.
- Texto: "🎁 15% OFF de bienvenida — Válido por: **14:59**".
- `useEffect` con `setInterval(1000)` + cleanup.

## 5. Carrito abandonado (Exit Intent)

**Archivos:** `src/pages/Checkout.tsx`, nuevo `src/components/cart/ExitIntentModal.tsx`, nueva edge function `supabase/functions/track-abandoned-cart/index.ts`

- En Checkout, watcher con dos triggers:
  1. **Inactividad email**: cuando `email` válido + `Date.now() - lastActivity > 180_000` → dispara una vez.
  2. **Mouseleave**: `document.addEventListener('mouseleave', e => { if (e.clientY < 0) trigger() })` (solo desktop, una vez por sesión).
- Trigger: `supabase.functions.invoke('track-abandoned-cart', { body: { email, items, total } })` + abrir `ExitIntentModal`.
- Modal: "¡Espera! Tu carrito está guardado. Finaliza ahora y llévate un regalo sorpresa" + botón verde "Continuar mi compra" (cierra modal) y botón secundario "Más tarde".
- Edge function: inserta en tabla nueva `abandoned_carts` (email, items jsonb, total, recovered bool, created_at). Migración incluida.

## 6. Sticky footer financiero

**Archivos:** `CartDrawer.tsx`, `src/components/OrderSummary.tsx`

- Mover `<OrderSummary />` + botón a `<SheetFooter className="sticky bottom-0 border-t bg-card p-4">`.
- Mantener input de cupones + `LoyaltyRedeemCard` (compact mode prop).
- Reactividad: ya usa selectores Zustand ✅.
- Bajo el botón añadir fila pequeña: iconos Visa/MC/Amex (lucide o SVG inline) + "🔒 Checkout 100% encriptado" en `text-xs text-muted-foreground`.

## 7. Panel de Afiliados v2 (paginación, filtros, export)

**Archivos:** `src/components/admin/AffiliatesSection.tsx` (extender Tab "Vendedores"/"Dashboard"), nuevas utilidades `src/lib/exportAffiliates.ts`

- **Paginación**: `<Pagination>` de shadcn, page size 25, server-side via `.range(from, to)`.
- **Filtros**: `DateRangePicker` (popover + Calendar shadcn con `pointer-events-auto`) + `<Select>` de estado (todos/pendiente/pagado/rechazado). Aplicados en queries a `affiliate_sales`.
- **Tabla**: columnas Vendedor · Clics · Conversiones · Ranking (calculado por ventas) · Comisión $ · Estado · Acciones.
- **Export**:
  - `📥 CSV`: `Papa.unparse()` (ya tenemos papaparse) → blob download.
  - `📄 PDF`: `jspdf` + `jspdf-autotable` (agregar deps) con header KPIs y tabla filtrada.

## 8. Playwright E2E — Lealtad + Afiliados

**Archivos:** nuevo `playwright-tests/checkout-affiliate.spec.js`

- **Caso 1 (Lealtad)**:
  1. Visit `/tienda`, `addItem` (click producto → "Agregar").
  2. `/checkout`, registrar y hacer login con cliente seed con ≥500 puntos.
  3. Capturar subtotal inicial, abrir `LoyaltyRedeemCard`, ingresar `500`, "Aplicar".
  4. Assert nuevo total = inicial − 500.
  5. Interceptar `**/functions/v1/create-order` con `page.route`, capturar payload, validar `loyalty_points_used === 500` y `total` correcto.

- **Caso 2 (Afiliados)**:
  1. `goto('/?ref=VENDEDOR123')`.
  2. Esperar y assert `localStorage.getItem('waxapp_affiliate_ref')` con `{code, expires}` y `expires > Date.now() + 29*86400_000`.
  3. Interceptar `**/functions/v1/track-affiliate-click` y validar disparo (status 200, body con `code:'VENDEDOR123'`).
  4. Flujo de compra → interceptar `create-order` y validar `affiliate_code` en payload (proxy de `affiliate_sales` server-side).

- Comentarios en cabecera: ejecutar con `npx playwright test playwright-tests/checkout-affiliate.spec.js`.

---

## Detalles técnicos

### Migración SQL (módulo 5)
```sql
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  recovered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
-- Solo admins leen; edge function inserta con service role.
CREATE POLICY "admins_read" ON public.abandoned_carts FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));
```

### Dependencias nuevas
- `jspdf`, `jspdf-autotable` (export PDF en módulo 7).
- `papaparse` ya presente (verificar).

### Tokens / clases
- Verde neón: `bg-primary` / `text-primary` (mapeado a `#00E676` en `index.css`).
- Ámbar countdown: extender `index.css` con `--warning: 38 100% 50%` y usar `text-warning`.
- Nada de colores hex sueltos en componentes.

### Archivos nuevos
```
src/components/cart/FreeShippingBar.tsx
src/components/cart/UpsellStrip.tsx
src/components/cart/ExitIntentModal.tsx
src/components/PromoCountdownBanner.tsx
src/lib/exportAffiliates.ts
supabase/functions/track-abandoned-cart/index.ts
supabase/migrations/<ts>_abandoned_carts.sql
playwright-tests/checkout-affiliate.spec.js
```

### Archivos modificados
```
src/store/cartStore.ts        (selector + ocultar badge si 0)
src/components/Navbar.tsx     (badge condicional + montar PromoCountdownBanner)
src/components/CartDrawer.tsx (refactor a Sheet + sticky footer + barras)
src/components/OrderSummary.tsx (logos Visa/MC + candado)
src/pages/Checkout.tsx        (watcher inactividad + mouseleave)
src/components/admin/AffiliatesSection.tsx (paginación + filtros + export)
package.json                  (jspdf deps)
```

Sin cambios al sistema de diseño existente, sin remover rutas, sin tocar `create-order` (ya soporta loyalty/affiliate).
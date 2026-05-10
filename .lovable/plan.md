## Objetivo

Mejorar el estado vacío del `CartDrawer` con accesibilidad, copy persuasivo, checklist de primera compra, y productos recomendados. Además, asegurar que el carrito inicie en cero para cualquier cliente/usuario que entre al sitio.

## Cambios

### 1. `src/components/CartDrawer.tsx` — Estado vacío rediseñado

Reemplazar el bloque actual del estado vacío por una experiencia más rica y accesible:

- **Accesibilidad**:
  - `role="region"` + `aria-label="Carrito vacío"` en el contenedor.
  - `autoFocus` en el CTA principal "Explorar Productos" cuando `items.length === 0` y el drawer abre (usar `useRef` + `useEffect` que dispare `.focus()` al abrir).
  - `aria-live="polite"` para anunciar el estado vacío a lectores de pantalla.
  - Icono `ShoppingBag` con `aria-hidden="true"` y texto alternativo descriptivo en `<span className="sr-only">`.
  - Navegación por teclado: orden lógico (CTA → checklist → recomendados), todos los elementos interactivos con `focus-visible` ring (ya viene de Tailwind, verificar).
  - `onKeyDown` global del Sheet ya maneja Escape (Radix). Tab cycling natural.

- **Copy persuasivo** (reemplazar texto actual):
  - Título: "Empieza tu ritual premium"
  - Subtítulo: "Envío gratis desde $1,500 · Pago 100% seguro · Productos de laboratorio certificado"
  - CTA: "Descubrir productos →" (más activo que "Explorar")
  - Microcopy debajo del CTA: "Más de 2,500 clientes activos este mes"

- **Checklist de primera compra** (solo en estado vacío):
  - Componente nuevo inline o `EmptyCartChecklist` con 3 ítems (icono + texto):
    - `Truck` — "Envío discreto a todo México"
    - `ShieldCheck` — "Pago encriptado (Clip / SPEI)"
    - `BadgeCheck` — "Productos legales y verificados"
  - Estilo: lista con check verde `text-primary`, fondo `bg-muted/40`, padding compacto.

- **Recomendados en estado vacío**:
  - Reutilizar lógica de `UpsellStrip` o crear `EmptyCartRecommendations` que consulta `products` (top 3-4 por `featured` o `bestseller`, con stock > 0).
  - Cada item: imagen + título + precio + botón "Agregar" (llama `addItem` y NO cierra el drawer — el carrito se llena ahí mismo y el estado vacío se reemplaza por la lista normal).
  - Encabezado: "Los favoritos del mes".

### 2. Reset del carrito al entrar (carrito en cero para cada visita)

Revisar `src/store/cartStore.ts` — actualmente usa persist (localStorage). El usuario pide que **siempre que entre un cliente/usuario, el carrito esté en cero**.

Opciones (a confirmar con usuario):
- **A**: Limpiar carrito en cada montaje de `App.tsx` (efecto que llama `clearCart()` una sola vez por sesión de navegador, usando `sessionStorage` como flag).
- **B**: Limpiar al detectar login/cambio de sesión auth (suscribirse a `onAuthStateChange` y vaciar al `SIGNED_IN`).
- **C**: Eliminar la persistencia del carrito (no usar `persist` middleware) — el carrito solo vive durante la pestaña.

Plan recomendado: **opción A + C combinadas** — quitar persist y agregar reset defensivo en `App.tsx` al primer mount, garantizando arranque limpio sin romper UX en navegaciones SPA.

### 3. Detalles técnicos

- Mantener tokens semánticos (`bg-card`, `text-foreground`, `text-primary`, `border-border`) — sin colores crudos.
- Iconos de `lucide-react`: `ShoppingBag`, `Truck`, `ShieldCheck`, `BadgeCheck`, `Sparkles`.
- Animar entrada del bloque vacío con `motion.div` (fade + slight y) consistente con el resto.
- No tocar lógica de descuentos, totales, ni `OrderSummary`.

## Archivos afectados

- `src/components/CartDrawer.tsx` (refactor del bloque empty)
- `src/components/cart/EmptyCartChecklist.tsx` (nuevo)
- `src/components/cart/EmptyCartRecommendations.tsx` (nuevo)
- `src/store/cartStore.ts` (quitar persist o ajustar)
- `src/App.tsx` (reset inicial de carrito)

## Pregunta antes de implementar

¿Confirmas que el carrito debe **vaciarse siempre al cargar el sitio** (perdiendo lo que el usuario haya agregado en una sesión previa)? Esto afecta la experiencia de retorno — un usuario que cierre la pestaña con productos en el carrito los perderá al regresar.

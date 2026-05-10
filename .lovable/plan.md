## Objetivo

Tres mejoras incrementales sobre el `CartDrawer` y el reset de carrito.

### 1. Reset de carrito a prueba de Strict Mode

Mover la lógica del flag `wax_cart_reset` fuera del `useEffect` para que se ejecute **una sola vez por pestaña** sin verse afectada por el doble-mount de React 18 Strict Mode.

- En `src/App.tsx`: reemplazar el componente `CartResetOnEntry` por una llamada a nivel de módulo (top-level guard) que:
  - Verifique `typeof window !== 'undefined'`.
  - Lea `sessionStorage.getItem('wax_cart_reset')`; si está vacío, marca el flag **antes** de llamar a `clearCart()` (set-then-clear evita carreras).
  - Use además una variable de módulo `let didReset = false` como segundo candado contra reentradas en HMR.
- Eliminar el `useEffect` y el componente envoltorio del árbol JSX.

### 2. Atajos de teclado y focus trap en `CartDrawer`

Radix `Sheet` ya da Escape y focus trap básico, pero el estado vacío necesita refuerzo.

- **Escape**: confirmado por Radix; añadir comentario y validar con un `onEscapeKeyDown` opcional para limpieza.
- **Focus trap**: el `Sheet` lo proporciona vía `Dialog`. Asegurar que el primer elemento focusable en el estado vacío sea el CTA "Descubrir productos" (ya tiene `emptyCtaRef.current?.focus()`).
- **Orden de tabulación**: revisar que el orden DOM sea: CTA principal → checklist (no interactivo) → botones "Agregar" de recomendaciones → botón cerrar (X). No usar `tabIndex` positivos.
- **Atajo extra**: agregar `Shift+Tab` desde el CTA que regrese al botón de cerrar (lo maneja Radix automáticamente — solo verificar). Documentar en comentario.
- **`aria-keyshortcuts="Escape"`** en `SheetContent` para anunciar a lectores de pantalla.
- En estado vacío, envolver la región en un `div` con `tabIndex={-1}` para evitar que el contenedor sea focusable accidentalmente.

### 3. Skeleton + manejo de error en `EmptyCartRecommendations`

Refactor de `src/components/cart/EmptyCartRecommendations.tsx`:

- Estados: `loading: boolean`, `error: string | null`, `items: Product[]`.
- **Loading**: render de 3 filas skeleton usando `Skeleton` de `@/components/ui/skeleton` (avatar 40×40 + dos líneas + placeholder de botón).
- **Error**: bloque compacto con icono `AlertCircle`, texto "No pudimos cargar recomendaciones" y botón "Reintentar" que vuelve a disparar el fetch.
- **Vacío sin error**: retornar `null` (comportamiento actual).
- Extraer el fetch a una función `loadRecommendations` reutilizable por el botón Reintentar.
- Mantener `aria-live="polite"` en el contenedor para anunciar cambios de estado.
- Mantener tokens semánticos (`bg-muted`, `text-muted-foreground`, `text-destructive`).

## Archivos afectados

- `src/App.tsx` — guard top-level en lugar de componente con efecto.
- `src/components/CartDrawer.tsx` — `aria-keyshortcuts`, ajustes menores de orden DOM y `tabIndex={-1}` en wrapper vacío.
- `src/components/cart/EmptyCartRecommendations.tsx` — skeleton + error + retry.

Sin cambios en lógica de negocio, store ni edge functions.

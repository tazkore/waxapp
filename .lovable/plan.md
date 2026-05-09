## Mejoras al Carrito y Checkout

Cambios enfocados en presentación y consistencia del carrito, sin tocar lógica de negocio del servidor.

### 1. Resumen reactivo en el drawer (`CartDrawer.tsx`)
- Agregar bloque visible con **subtotal**, **envío estimado** (placeholder "Calculado en checkout") y **total**.
- Derivar valores directamente desde `useCartStore` para que se actualicen al instante con cada cambio.
- Mostrar contador de items totales en el header del drawer.

### 2. Validación de cantidades (`cartStore.ts` + `CartDrawer.tsx`)
- En `updateQuantity`: clamp con `Math.max(1, Math.floor(quantity))` cuando se llama desde botones (cantidades < 1 solo permiten eliminación explícita vía `removeItem`).
- Agregar un tope superior razonable (ej. 99) para evitar inputs absurdos.
- Deshabilitar botón "−" cuando `quantity === 1` (ya existe) y "+" cuando llega al tope.
- Prevenir doble click con guard local mientras se procesa el cambio.

### 3. Clave compuesta en Checkout (`Checkout.tsx`)
- Auditar todos los puntos donde se itera `items` para construir el pedido y calcular precios.
- Usar `${item.id}::${item.selectedVariant ?? ''}` como identificador en líneas de pedido enviadas al edge function `create-order`.
- Asegurar que el subtotal del checkout coincida con `subtotal()` del store (mismo cálculo).

### 4. Persistencia (verificar)
- `cartStore.ts` ya usa `persist` con `localStorage` y `partialize` por `items`. Confirmar que `selectedVariant` y `quantity` se restauran correctamente al recargar.
- Sin cambios salvo agregar `version` y migración no-op por seguridad para futuros refactors.

### 5. Notificaciones y micro-animaciones (`CartDrawer.tsx`)
- `sonner` toasts:
  - Eliminar: `toast.success("Producto eliminado", { description: item.title, action: { label: "Deshacer", onClick: ... } })` con restauración del item.
  - Cambio de cantidad: toast sutil opcional o solo animación.
- Animaciones con `framer-motion`:
  - `AnimatePresence` + `layout` en la lista para entrada/salida suave.
  - Pulse en el contador de cantidad al cambiar.
  - Fade+slide al remover item.

### Detalles técnicos
- Mantener API actual del store (`removeItem(id)`, `updateQuantity(id, qty)` aceptando clave compuesta o plain id).
- No modificar edge functions ni esquema DB.
- Mantener tokens semánticos (sin colores hardcoded).
- "Deshacer" reinserta el item con `addItem(product, qty, variant)` desde un snapshot guardado antes de eliminar.

### Archivos a editar
- `src/store/cartStore.ts` — clamp en updateQuantity, version en persist.
- `src/components/CartDrawer.tsx` — resumen, animaciones, toasts con undo.
- `src/pages/Checkout.tsx` — clave compuesta en construcción del pedido.

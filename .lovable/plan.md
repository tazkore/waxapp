# Plan de actualización pre-producción

Mantengo el Dark Mode Tech (#0A0A0A / #00E676 / #FFB300), tipografía Space Grotesk + Inter, y no elimino componentes existentes. Solo inyecto/reparo.

## 1. Routing `/tienda` (fix 404)

- En `src/App.tsx` añadir, antes del catch-all `*` y del `/:slug`:
  - `<Route path="/tienda" element={<Index />} />`
  - Reutilizo `Index` (que ya contiene `ProductGrid`) para no duplicar UI.
- Añadir también alias `/shop` → `<Navigate to="/tienda" replace />` por compatibilidad.
- Actualizar enlaces internos de Navbar/Footer que apunten a `#productos` para que vayan a `/tienda`.

## 2. Modal de producto con variantes (composite key)

- Ya existe `QuickViewDialog.tsx`. Lo extiendo en lugar de crear uno nuevo:
  - Galería simple (imagen principal + thumbnails si `images[]` existe).
  - Lista de beneficios (`product.benefits` parseado por saltos de línea / viñetas).
  - Selector de variantes con `RadioGroup` shadcn (Sabor / Gramos / Mg) leído de `product.variants`.
  - Botón "Agregar al carrito" deshabilitado hasta seleccionar variante (si hay variantes).
- En `ProductCard.tsx`: el click sobre la tarjeta abre el modal en vez de agregar directo. El botón "Agregar" del card también abre el modal cuando el producto tiene variantes; sin variantes mantiene el add directo.
- Identificador en el carrito: ya existe la convención `${id}::${variant ?? ''}`. Confirmo que `addItem` en `cartStore` la respete (ya lo hace) y la uso en el modal al disparar `addItem(product, 1, variantSeleccionada)`.
- Toast: usar `sonner` con `toast.success('Agregado al carrito exitosamente')` envuelto en un `motion.div` (fade + slide) vía `toast.custom` para la micro-animación verde neón.

## 3. Cupones y checkout reactivo

- Estado global ligero en `cartStore`:
  - Campos: `discountCode: string | null`, `discountAmount: number`, `discountType: 'percent'|'fixed'|null`.
  - Acciones: `applyDiscount(code)` (llama edge function existente `validate-discount`), `clearDiscount()`.
- En `CartDrawer.tsx` y en `Checkout.tsx` (paso 3) añadir:
  - Input "Código de descuento" + botón "Aplicar" + botón "Quitar" si hay uno activo.
  - Estados visuales: loading, error (código inválido), éxito (chip verde con código).
- Desglose reactivo (componente compartido `OrderSummary`):
  ```text
  Subtotal:            $X
  Descuento (CODIGO): -$Y
  Envío:               $Z   (Gratis si subtotal - descuento >= 1500 MXN)
  ─────────────────────────
  Total:               $W
  ```
- El umbral de envío gratis (1500 MXN) se define como constante exportada `FREE_SHIPPING_THRESHOLD` para reusar en drawer y checkout.
- En `Checkout.tsx` el cuerpo del pedido enviado a `create-order` incluye `discount_code`, `discount_amount` y `shipping_cost` ya recalculados (la lógica final de validación sigue server-side, sin cambios en edge functions).

## 4. Pantalla `/orden-completada`

- Nuevo archivo `src/pages/OrderComplete.tsx`:
  - Lee `orderNumber` desde `location.state` o query `?folio=WX-XXXX`.
  - Si no hay folio, genera uno aleatorio `WX-` + 4 dígitos como fallback visual.
  - Diseño centrado:
    - Círculo con `Check` gigante (96px) color `#00E676` con glow.
    - H1 "¡Pedido confirmado!" (Space Grotesk).
    - Folio destacado.
    - Resumen de artículos (lee snapshot pasado en `state.items` con variantes correctas — usamos la composite key como `key`).
    - Texto: "Tu orden está siendo preparada. Recibirás tu guía de envío por correo."
    - CTAs: "Volver a la tienda" → `/tienda`, "Ver mi cuenta" → `/mi-cuenta`.
- Registrar la ruta en `App.tsx`: `<Route path="/orden-completada" element={<OrderComplete />} />`.
- En `Checkout.tsx`, tras `create-order` exitoso, en lugar de mostrar el bloque inline `confirmed`, hacer:
  ```tsx
  navigate('/orden-completada', { state: { orderNumber, items: snapshot, total } });
  clearCart();
  ```

## 5. Marcas destacadas + seed de productos

- En `BrandsStrip.tsx` (carrusel ya existente): marcar `is_featured` visual para Neshika, Muha Meds, Pulse THC, WAXAPP, Ace Ultra → orden prioritario y borde neón sutil + glow `#00E676` al hover.
- En `ProductGrid.tsx`: añadir filtro chip por marca con esas 5 marcas como pills destacadas arriba del grid.
- Datos base: actualizar `src/data/products.ts` (catálogo local de fallback usado cuando la tabla `products` viene vacía) añadiendo los items del JSON pedido, adaptados al tipo `Product` existente:
  ```ts
  { id: 'evp1', title: 'Muha Meds 2gr', category: 'Hardware', brand: 'Muha Meds',
    price: 420, variants: [{name:'Sativa',price:420},{name:'Indica',price:420}], image: '/placeholders/muha.jpg' },
  // evp2, evp3, wx1 análogos
  ```
- Extender la interfaz `Product` en `cartStore.ts` con `brand?: string` (opcional, no rompe nada).
- Si la tabla `products` de Supabase está vacía, `ProductGrid` ya hace fallback a estos datos locales, así que la tienda se puebla al instante.

## Detalles técnicos

- Sin cambios de DB ni edge functions nuevos. Reuso `validate-discount` y `create-order` ya desplegados.
- Persistencia de cupón: dentro del mismo `persist` del cart store (campo nuevo en `partialize`).
- Sin alterar tokens del design system; los nuevos elementos usan clases existentes (`bg-primary`, `text-primary`) o `style` con `#00E676`/`#FFB300` cuando ya se hace en componentes vecinos.
- Tests: no añado tests automatizados; verifico manualmente las 5 áreas en preview tras implementar.

## Archivos a tocar

- `src/App.tsx` — rutas `/tienda`, `/shop`, `/orden-completada`.
- `src/components/QuickViewDialog.tsx` — selector de variantes + add-to-cart.
- `src/components/ProductCard.tsx` — abrir modal en click.
- `src/components/CartDrawer.tsx` — input de cupón + summary reactivo.
- `src/components/OrderSummary.tsx` — nuevo, compartido drawer/checkout.
- `src/store/cartStore.ts` — estado de descuento + `brand` en `Product`.
- `src/pages/Checkout.tsx` — usar OrderSummary, redirigir a `/orden-completada`.
- `src/pages/OrderComplete.tsx` — nueva página.
- `src/components/BrandsStrip.tsx` y `src/components/ProductGrid.tsx` — destacar/filtrar marcas.
- `src/data/products.ts` — seed evp1-evp3, wx1.
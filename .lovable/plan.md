## Objetivo

Mejorar UX de la tienda con modales legales interactivos, FAQ navegable, filtros avanzados de catálogo y un mini onboarding del carrito. El checkout ya existe completo (3 pasos con dirección, envío, resumen y pago Clip) — sólo se confirmará flujo end-to-end.

## Alcance

### 1. Modales Legales y Términos
- Crear `src/components/LegalModal.tsx`: Dialog (shadcn) reutilizable con título, contenido scrolleable (`ScrollArea`), checkbox "He leído y acepto" y botón **Aceptar** en verde neón `#00E676`.
- Persistir aceptación en `localStorage` (`wax_legal_accepted`, `wax_terms_accepted`) con timestamp.
- Convertir las 3 tarjetas de `LegalSection.tsx` en clickeables (cada una abre el modal con su contenido: Cumplimiento Normativo, Aviso de Privacidad, Términos y Condiciones).
- Contenido legal: Aviso de privacidad (LFPDPPP), Términos de venta (productos 18+, no reembolso de consumibles, política de envío) y Cumplimiento (NOM-251, amparos cáñamo).
- Estado visual: tarjeta muestra badge verde "✓ Aceptado" tras confirmación.

### 2. FAQ con Acordeón + Quick Links Navbar
- `FAQSection.tsx` ya tiene acordeón. Mejoras:
  - Asignar `id="faq"` a la sección y `id` único a cada `AccordionItem` (`faq-legal`, `faq-envio`, `faq-dosis`, `faq-fullspectrum`) para deep-links.
  - Añadir buscador local (Input) que filtra por pregunta/respuesta.
  - Auto-abrir el item correspondiente si el hash de URL coincide.
- En `Navbar.tsx`: agregar dropdown "FAQ ▾" en `FALLBACK_LINKS` con 4 quick-links (`/#faq-legal`, `/#faq-envio`, etc.) usando `DropdownMenu`. En mobile, expandir como sub-lista.

### 3. Filtros y Búsqueda en Catálogo
- Ampliar `ProductGrid.tsx`:
  - Input de búsqueda por nombre/SKU (debounce 250ms).
  - Slider de rango de precio (`@/components/ui/slider`) con min/max dinámicos del catálogo.
  - Select de orden: Relevancia, Precio ↑, Precio ↓, Más nuevos, Nombre A-Z.
  - Botón "Limpiar filtros" cuando hay alguno activo.
  - Mantener filtros existentes (categoría, marca).
  - Mostrar contador "X productos encontrados".
- Layout: barra superior sticky con todos los filtros agrupados en un `Card` colapsable en mobile.

### 4. Checkout (verificación end-to-end)
- `src/pages/Checkout.tsx` ya implementa los 3 pasos requeridos (dirección, envío, resumen, pago Clip). **No se reescribe.**
- Verificar visualmente con `browser--navigate_to_sandbox` el flujo completo y corregir cualquier glitch.

### 5. Mini Onboarding del Carrito
- Crear `src/components/CartOnboarding.tsx`: tour de 3 pasos sobre `CartDrawer` cuando se abre por primera vez.
  - Paso 1: "Agrega productos desde la tienda" (apunta al área de items).
  - Paso 2: "Quita lo que no quieras con el ícono 🗑️" (apunta a `Trash2`).
  - Paso 3: "Haz clic en **Proceder al Pago Seguro** para finalizar" (apunta al CTA).
- Implementación: overlay con `motion` + tooltip posicionado, botones "Anterior / Siguiente / Listo".
- Persistir vista en `localStorage.wax_cart_onboarding_seen`. Botón "?" en header del drawer para volver a verlo.
- Integrar en `CartDrawer.tsx` con prop opcional.

## Detalles técnicos

- **Modales**: usar `Dialog` de `@/components/ui/dialog` + `ScrollArea`. Estética dark `bg-card border-border`, header con ícono primary.
- **Búsqueda producto**: filtrado client-side sobre `products` ya cargados (no hace falta query nueva). Para SKU/nombre usar `String.includes()` case-insensitive normalizado.
- **Slider precio**: `@/components/ui/slider` con `value={[min, max]}`, paso 50.
- **Deep-links FAQ**: `useEffect` en `FAQSection` que lee `window.location.hash` y setea `defaultValue` del Accordion.
- **Onboarding**: portal sobre el drawer con `z-[80]`, máscara semitransparente y "spotlight" usando `clip-path` o highlight CSS sobre el target via `ref`.
- Sin cambios de DB, sin nuevas Edge Functions, sin nuevos secretos.

## Archivos

**Nuevos**
- `src/components/LegalModal.tsx`
- `src/components/CartOnboarding.tsx`
- `src/lib/legalContent.ts` (textos legales)

**Editados**
- `src/components/LegalSection.tsx` (tarjetas clickeables + estado aceptado)
- `src/components/FAQSection.tsx` (búsqueda + IDs + deep-link)
- `src/components/Navbar.tsx` (dropdown FAQ con quick-links)
- `src/components/ProductGrid.tsx` (búsqueda, slider precio, orden, contador)
- `src/components/CartDrawer.tsx` (integrar onboarding + botón "?")

## QA final
- Ejecutar el flujo: abrir tienda → buscar producto → agregar al carrito (ver onboarding) → checkout 3 pasos → confirmar.
- Validar modales legales abren/cierran y persisten aceptación.
- Validar quick-links del navbar saltan al FAQ con item abierto.

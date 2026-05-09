# WAXAPP — Pruebas E2E con Playwright

Suite de pruebas End-to-End que simula un usuario real abriendo el navegador,
agregando productos al carrito y completando el checkout.

## Setup local

```bash
# Una sola vez: instalar navegadores
npx playwright install

# Variables opcionales
export E2E_BASE_URL="http://localhost:8080"   # default
export E2E_ADMIN_EMAIL="admin@waxapp.mx"
export E2E_ADMIN_PASSWORD="••••••••"
```

## Ejecutar

```bash
npx playwright test                       # corre toda la suite headless
npx playwright test --ui                  # modo UI interactivo
npx playwright test --headed              # ver el navegador
npx playwright test e2e.spec --project=chromium
```

## Tests incluidos

1. **Public flow** — Home → Tienda → Agregar al carrito → Checkout
2. **Affiliate flow** — `?ref=TEST123` se guarda en localStorage y persiste tras navegar
3. **Admin flow** — Login admin y carga del dashboard (skip si no hay credenciales)

## Notas

- La configuración global de Playwright vive en `playwright.config.ts` en la raíz.
- Las fixtures personalizadas están en `playwright-fixture.ts`.
- Estos tests se ejecutan **localmente**, no en el preview de Lovable.

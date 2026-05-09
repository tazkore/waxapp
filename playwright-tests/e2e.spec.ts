/**
 * WAXAPP — End-to-End test suite
 *
 * Ejecutar localmente:
 *   npx playwright install   # primera vez
 *   npx playwright test                       # corre todo
 *   npx playwright test --ui                  # UI interactiva
 *   npx playwright test e2e.spec --project=chromium
 *
 * Variables de entorno (opcionales para los flujos privados):
 *   E2E_BASE_URL          (default: http://localhost:8080)
 *   E2E_ADMIN_EMAIL       admin de pruebas
 *   E2E_ADMIN_PASSWORD    password del admin
 */
import { test, expect } from '../playwright-fixture';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

test.describe('Public storefront flow', () => {
  test('home → tienda → agregar al carrito → checkout', async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Cerrar age gate si aparece
    const ageBtn = page.getByRole('button', { name: /soy mayor|tengo 18/i });
    if (await ageBtn.isVisible().catch(() => false)) {
      await ageBtn.click();
    }
    await expect(page).toHaveTitle(/wax/i);

    await page.goto(`${BASE}/tienda`);
    // Click primer botón "Agregar"
    const addBtn = page.getByRole('button', { name: /agregar/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addBtn.click();

    // Abrir carrito
    await page.getByRole('button', { name: /carrito/i }).first().click();

    // Ir a checkout
    const checkoutBtn = page.getByRole('link', { name: /checkout|pagar/i }).first();
    if (await checkoutBtn.isVisible().catch(() => false)) {
      await checkoutBtn.click();
      await expect(page).toHaveURL(/\/(checkout|cliente)/);
    }
  });
});

test.describe('Affiliate tracking flow', () => {
  test('?ref=TEST123 persiste en localStorage tras navegación SPA', async ({ page }) => {
    await page.goto(`${BASE}/?ref=TEST123`);
    await page.waitForTimeout(500); // dejar que el useEffect dispare

    const stored = await page.evaluate(() => localStorage.getItem('waxapp_affiliate_ref'));
    expect(stored).toBe('TEST123');

    // Navegar a /tienda y verificar persistencia
    await page.goto(`${BASE}/tienda`);
    const stillStored = await page.evaluate(() => localStorage.getItem('waxapp_affiliate_ref'));
    expect(stillStored).toBe('TEST123');
  });
});

test.describe('Admin dashboard flow', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'requiere E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD');

  test('login admin y verificar carga de Overview', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/contraseña|password/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /entrar|iniciar/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    // Verificar que las métricas cargan
    await expect(page.getByText(/pedidos|ventas|órdenes/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

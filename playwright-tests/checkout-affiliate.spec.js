// E2E: Lealtad (WAX Points) + Tracking de Afiliados
// Ejecutar localmente con:  npx playwright test playwright-tests/checkout-affiliate.spec.js
//
// Requisitos previos:
//   - Variables de entorno: BASE_URL, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD
//   - El cliente seed debe tener al menos 500 WAX Points en su cuenta
//   - El sandbox está corriendo en BASE_URL (default http://localhost:5173)

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Caso 1 — Lealtad (WAX Points)', () => {
  test('aplica 500 puntos y los envía en el payload de create-order', async ({ page }) => {
    // 1) Carrito lleno
    await page.goto(`${BASE}/tienda`);
    await page.getByRole('button', { name: /agregar/i }).first().click();

    // 2) Login cliente con saldo de puntos
    await page.goto(`${BASE}/cliente?redirect=/checkout`);
    await page.getByLabel(/email/i).fill(process.env.E2E_CLIENT_EMAIL || 'puntos@waxapp.test');
    await page.getByLabel(/contrase/i).fill(process.env.E2E_CLIENT_PASSWORD || 'Puntos500!');
    await page.getByRole('button', { name: /iniciar sesi/i }).click();

    // 3) En checkout, capturar total inicial y aplicar puntos
    await page.waitForURL(/\/checkout/);
    const totalInicial = Number(
      (await page.locator('[data-test="grand-total"]').first().textContent())?.replace(/\D/g, '') || 0
    );

    await page.getByRole('switch', { name: /usar wax points/i }).click();
    await page.getByLabel(/cantidad de puntos/i).fill('500');
    await page.getByRole('button', { name: /aplicar/i }).click();

    // 4) Validar descuento -$500
    const totalDespues = Number(
      (await page.locator('[data-test="grand-total"]').first().textContent())?.replace(/\D/g, '') || 0
    );
    expect(totalInicial - totalDespues).toBe(500);

    // 5) Interceptar payload de create-order
    const reqPromise = page.waitForRequest((r) =>
      r.url().includes('/functions/v1/create-order') && r.method() === 'POST'
    );
    await page.getByRole('button', { name: /pagar|confirmar pedido/i }).click();
    const req = await reqPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.loyalty_points_used).toBe(500);
  });
});

test.describe('Caso 2 — Tracking de Afiliados (?ref=)', () => {
  test('persiste ref con TTL 30d, dispara click y propaga al checkout', async ({ page }) => {
    const trackPromise = page.waitForRequest((r) =>
      r.url().includes('/functions/v1/track-affiliate-click')
    );
    await page.goto(`${BASE}/?ref=VENDEDOR123`);
    const trackReq = await trackPromise;
    const trackBody = JSON.parse(trackReq.postData() || '{}');
    expect(trackBody.code).toBe('VENDEDOR123');

    // localStorage con TTL ≥ 29 días
    const ls = await page.evaluate(() => localStorage.getItem('waxapp_affiliate_ref'));
    expect(ls).toBeTruthy();
    const parsed = JSON.parse(ls);
    expect(parsed.code).toBe('VENDEDOR123');
    expect(parsed.expires).toBeGreaterThan(Date.now() + 29 * 86400 * 1000);

    // Compra → create-order debe llevar affiliate_code
    await page.goto(`${BASE}/tienda`);
    await page.getByRole('button', { name: /agregar/i }).first().click();
    await page.goto(`${BASE}/checkout`);

    const orderReqPromise = page.waitForRequest((r) =>
      r.url().includes('/functions/v1/create-order') && r.method() === 'POST'
    );
    await page.getByRole('button', { name: /pagar|confirmar pedido/i }).click();
    const orderReq = await orderReqPromise;
    const orderBody = JSON.parse(orderReq.postData() || '{}');
    expect(orderBody.affiliate_code).toBe('VENDEDOR123');
  });
});

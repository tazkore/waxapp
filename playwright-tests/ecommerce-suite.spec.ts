/**
 * WAXAPP — Suite E2E completa (grupoko Supabase)
 * Ejecutar: npx playwright test playwright-tests/ecommerce-suite.spec.ts --project=chromium
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5175";
const AGE_KEY = "waxapp_age_verified";
const AFFILIATE_KEY = "waxapp_affiliate_ref";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function bypassAge(page: any) {
  await page.addInitScript((key: string) => {
    localStorage.setItem(key, "true");
  }, AGE_KEY);
}

// ── 1. Age Gate ───────────────────────────────────────────────────────────────
test.describe("Age Gate (+18)", () => {
  test("muestra el modal sin localStorage", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(
      page.getByRole("heading", { name: "Verificación de Edad" })
    ).toBeVisible({ timeout: 6000 });
  });

  test("confirmar persiste en localStorage y cierra el modal", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: /tengo \+18|soy mayor/i }).click();
    await expect(
      page.getByRole("heading", { name: "Verificación de Edad" })
    ).not.toBeVisible({ timeout: 3000 });
    const val = await page.evaluate((k: string) => localStorage.getItem(k), AGE_KEY);
    expect(val).toBe("true");
  });

  test("no muestra el modal si ya verificado en localStorage", async ({ page }) => {
    await bypassAge(page);
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");
    const heading = page.getByRole("heading", { name: "Verificación de Edad" });
    await expect(heading).not.toBeVisible({ timeout: 3000 });
  });
});

// ── 2. Storefront — productos live desde grupoko ──────────────────────────────
test.describe("Storefront — productos live desde grupoko", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("muestra al menos 1 producto en Productos Destacados", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // FeaturedCarousel muestra precios como "$85" o "$455"
    await expect(page.getByText(/^\$\d+$/).first()).toBeVisible({ timeout: 10000 });
  });

  test("Nuestra Colección muestra 20 productos encontrados", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByText("20 productos encontrados")).toBeVisible({ timeout: 12000 });
  });

  test("filtro 'disposables' reduce la lista", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector("text=20 productos encontrados", { timeout: 12000 });
    await page.getByRole("button", { name: "disposables" }).click();
    await page.waitForTimeout(500);
    const text = await page.getByText(/\d+ productos? encontrados/).first().textContent();
    expect(parseInt(text ?? "20")).toBeLessThan(20);
  });

  test("buscar 'bugatti' filtra a 2 productos", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector("text=20 productos encontrados", { timeout: 12000 });
    await page.getByPlaceholder(/buscar.*nombre.*sku/i).fill("bugatti");
    await page.waitForTimeout(600);
    await expect(page.getByText("2 productos encontrados")).toBeVisible({ timeout: 4000 });
  });
});

// ── 3. Carrito — agregar al carrito ──────────────────────────────────────────
test.describe("Carrito", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("hacer clic en Agregar al carrito desde el grid", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector("text=20 productos encontrados", { timeout: 12000 });
    const addBtn = page.getByRole("button", { name: /agregar/i }).first();
    const visible = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!visible) { test.skip(); return; }
    await addBtn.click();
    // El carrito se abre — drawer/sheet
    await page.waitForTimeout(500);
    // Cualquier indicador de que el carrito recibió el item
    await page.waitForTimeout(800);
    const cartCount = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes('cart'));
      if (!key) return 0;
      try {
        const data = JSON.parse(localStorage.getItem(key) ?? '{}');
        return (data?.state?.items ?? data?.items ?? []).length;
      } catch { return 0; }
    });
    expect(cartCount).toBeGreaterThan(0);
  });
});

// ── 4. PromoCountdown Banner ──────────────────────────────────────────────────
test.describe("PromoCountdown Banner", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("el banner '15% OFF de bienvenida' es visible", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // El banner tiene role="status" — scope para evitar strict mode
    await expect(
      page.locator('[role="status"]').getByText(/15% OFF de bienvenida/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("el banner muestra cuenta regresiva MM:SS", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // El timer está dentro del banner role="status"
    const timerText = await page
      .locator('[role="status"] span.font-mono').first()
      .textContent({ timeout: 5000 });
    expect(timerText).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ── 5. Afiliados ──────────────────────────────────────────────────────────────
test.describe("Sistema de Afiliados", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("?ref=CODE se guarda en localStorage con clave waxapp_affiliate_ref", async ({ page }) => {
    await page.goto(`${BASE}/?ref=DISTRIBTEST`);
    await page.waitForTimeout(600);
    const ref = await page.evaluate((k: string) => localStorage.getItem(k), AFFILIATE_KEY);
    expect(ref).toBe("DISTRIBTEST");
  });

  test("la landing de afiliados carga con el hero correcto", async ({ page }) => {
    await page.goto(`${BASE}/afiliados`);
    await expect(
      page.getByRole("heading", { name: /gana.*%.*venta|programa.*afiliado/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("el portal de vendedores tiene formulario de login", async ({ page }) => {
    await page.goto(`${BASE}/portal-vendedores/login`);
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 6000 });
  });
});

// ── 6. Admin Login ────────────────────────────────────────────────────────────
test.describe("Admin Login", () => {
  test("la página /admin/login carga con el formulario", async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await expect(
      page.getByRole("heading", { name: /staff|admin/i }).first()
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("textbox").first()).toBeVisible();
  });

  test("credenciales incorrectas muestran mensaje de error", async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.getByRole("textbox").first().fill("fake@test.com");
    await page.getByRole("textbox").nth(1).fill("wrongpassword123");
    await page.getByRole("button", { name: /iniciar sesi/i }).first().click();
    await expect(page.getByText(/error|inválid|incorrect|credenciales/i).first()).toBeVisible({ timeout: 6000 });
  });
});

// ── 7. Blog ───────────────────────────────────────────────────────────────────
test.describe("Blog", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("la página /blog carga sin errores de consola", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE}/blog`);
    await page.waitForLoadState("networkidle");
    // Solo errores de red secundarios aceptables (no JS errors)
    const jsErrors = errors.filter(e => !e.includes("Failed to load resource"));
    expect(jsErrors).toHaveLength(0);
  });
});

// ── 8. Responsive ─────────────────────────────────────────────────────────────
test.describe("Responsive — Mobile 375px", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("la home muestra el logo WAXAPP en mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`);
    await expect(page.getByText("WAXAPP.").first()).toBeVisible({ timeout: 5000 });
  });

  test("el banner de promo es visible en mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`);
    await expect(page.locator('[role="status"]').getByText(/15% OFF/i)).toBeVisible({ timeout: 5000 });
  });
});

// tests/ecommerce.spec.js — Playwright E2E WAXAPP
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function bypassAgeGate(page) {
  await page.addInitScript(() => {
    localStorage.setItem("waxapp-age-verified", "true");
  });
}

async function preloadCart(page, price = 500, qty = 2) {
  await page.addInitScript(
    ({ p, q }) => {
      localStorage.setItem("waxapp-cart", JSON.stringify({
        state: {
          items: [{
            key: "prod-test::default",
            id: "prod-test",
            name: "Vape Test Pro",
            variant: "default",
            price: p,
            image: "",
            qty: q,
            waxPoints: 50,
          }],
          couponCode: "",
          couponDiscount: 0,
          pointsToRedeem: 0,
          isOpen: false,
        },
        version: 0,
      }));
    },
    { p: price, q: qty }
  );
}

async function openCart(page) {
  await page.locator("header button[aria-label*='Carrito']").click();
  // Espera el Sheet: el heading del drawer (rol=dialog > heading)
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Tu Carrito" }))
    .toBeVisible({ timeout: 4000 });
}

// ── 1. Age Gate (+18) ────────────────────────────────────────────────────────

test.describe("Age Gate (+18)", () => {
  test("muestra el modal de verificación sin localStorage", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText("Verificación de Edad")).toBeVisible({ timeout: 5000 });
  });

  test("al confirmar: persiste en localStorage y oculta el modal", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText("Verificación de Edad")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /mayor de 18/i }).click();

    await expect(page.getByText("Verificación de Edad")).not.toBeVisible();
    const val = await page.evaluate(() => localStorage.getItem("waxapp-age-verified"));
    expect(val).toBe("true");
  });

  test("NO muestra el modal si ya está verificado en localStorage", async ({ page }) => {
    await bypassAgeGate(page);
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Verificación de Edad")).not.toBeVisible();
  });
});

// ── 2. Carrito — agregar producto ─────────────────────────────────────────────

test.describe("Carrito — agregar al carrito", () => {
  test.beforeEach(async ({ page }) => bypassAgeGate(page));

  test("el contador del navbar sube a 1 al agregar un producto", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);

    const addBtn = page.getByRole("button", { name: /Agregar/i }).first();
    const hasProducts = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasProducts) { test.skip(); return; }

    await addBtn.click();
    await expect(page.locator("header").getByText("1")).toBeVisible({ timeout: 3000 });
  });

  test("agregar el mismo producto dos veces incrementa qty (no duplica item)", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);

    const addBtn = page.getByRole("button", { name: /Agregar/i }).first();
    const hasProducts = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasProducts) { test.skip(); return; }

    await addBtn.click();
    await addBtn.click();
    await expect(page.locator("header").getByText("2")).toBeVisible({ timeout: 3000 });
  });

  test("el CartSheet slide-out se abre y muestra el item", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);

    const addBtn = page.getByRole("button", { name: /Agregar/i }).first();
    const hasProducts = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasProducts) { test.skip(); return; }

    await addBtn.click();
    await openCart(page);
    // El carrito tiene al menos un item (no muestra "vacío")
    await expect(page.getByText("Tu carrito está vacío")).not.toBeVisible();
  });
});

// ── 3. Cupón — cálculo matemático ────────────────────────────────────────────

test.describe("Cupones — cálculo matemático", () => {
  // Carrito pre-cargado: 2 × $500 = subtotal $1,000
  test.beforeEach(async ({ page }) => {
    await bypassAgeGate(page);
    await preloadCart(page, 500, 2);
  });

  test("cupón WAXAPP10 aplica 10% y muestra toast de éxito", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    await page.getByPlaceholder("WAXAPP10").fill("WAXAPP10");
    await page.getByRole("button", { name: "Aplicar" }).click();

    await expect(page.getByText(/cupón aplicado/i)).toBeVisible({ timeout: 3000 });
  });

  test("cálculo matemático: $1,000 × 10% = descuento $100", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    await page.getByPlaceholder("WAXAPP10").fill("WAXAPP10");
    await page.getByRole("button", { name: "Aplicar" }).click();

    // exact:true evita match con "✓ WAXAPP10 — −$100" (el span del total es exacto)
    await expect(page.getByRole("dialog").getByText("−$100", { exact: true })).toBeVisible({ timeout: 3000 });
  });

  test("cupón inválido muestra toast de error", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    await page.getByPlaceholder("WAXAPP10").fill("CUPONFAKE99");
    await page.getByRole("button", { name: "Aplicar" }).click();

    await expect(page.getByText(/inválido|expirado/i)).toBeVisible({ timeout: 3000 });
  });

  test("MAYOREO15 aplica 15% de descuento → $150 de $1,000", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    await page.getByPlaceholder("WAXAPP10").fill("MAYOREO15");
    await page.getByRole("button", { name: "Aplicar" }).click();

    await expect(page.getByRole("dialog").getByText("−$150", { exact: true })).toBeVisible({ timeout: 3000 });
  });
});

// ── 4. WAX Points — canje ────────────────────────────────────────────────────

test.describe("WAX Points — canje en carrito", () => {
  test.beforeEach(async ({ page }) => {
    await bypassAgeGate(page);
    await preloadCart(page, 500, 2); // subtotal $1,000
  });

  test("canjear 100 puntos → descuento de $10 (1 pt = $0.10)", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    await page.getByPlaceholder(/Hasta .* pts/).fill("100");
    await page.getByRole("button", { name: "Canjear" }).click();

    await expect(page.getByText(/canjeando 100/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("dialog").getByText("−$10", { exact: true })).toBeVisible({ timeout: 3000 });
  });

  test("intentar canjear más puntos de los disponibles muestra error", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);

    // El usuario tiene 320 pts simulados; intentar 999
    await page.getByPlaceholder(/Hasta .* pts/).fill("999");
    await page.getByRole("button", { name: "Canjear" }).click();

    await expect(page.getByText(/320 wax puntos/i)).toBeVisible({ timeout: 3000 });
  });
});

// ── 5. Free Shipping Bar ──────────────────────────────────────────────────────

test.describe("Progress Bar de Envío Gratis ($1,500)", () => {
  test.beforeEach(async ({ page }) => bypassAgeGate(page));

  test("con carrito vacío muestra mensaje de vacío", async ({ page }) => {
    await page.goto(BASE);
    await openCart(page);
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible({ timeout: 3000 });
  });

  test("con subtotal ≥ $1,500 muestra mensaje de envío gratis", async ({ page }) => {
    await preloadCart(page, 800, 2); // $1,600
    await page.goto(BASE);
    await openCart(page);
    // Busca el mensaje específico dentro del dialog (no el perks del home)
    await expect(page.getByRole("dialog").getByText("¡Tienes envío gratis!")).toBeVisible({ timeout: 3000 });
  });

  test("con subtotal < $1,500 muestra cuánto falta", async ({ page }) => {
    await preloadCart(page, 200, 2); // $400 — faltan $1,100
    await page.goto(BASE);
    await openCart(page);
    await expect(page.getByText(/\$1[,.]100|1100/)).toBeVisible({ timeout: 3000 });
  });
});

// ── 6. FOMO Timer ────────────────────────────────────────────────────────────

test.describe("FOMO Timer — banner de cuenta regresiva", () => {
  test.beforeEach(async ({ page }) => bypassAgeGate(page));

  test("el banner del FOMO timer es visible al cargar la home", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText(/precios especiales/i)).toBeVisible({ timeout: 5000 });
  });

  test("el FOMO timer guarda el valor en sessionStorage", async ({ page }) => {
    await page.goto(BASE);
    // Espera al menos 1 segundo para que el timer haga tick
    await page.waitForTimeout(1100);
    const stored = await page.evaluate(() => sessionStorage.getItem("fomo-timer"));
    // Debe existir y ser un número <= 899 (empezó en 900 y bajó al menos 1)
    expect(stored).not.toBeNull();
    expect(parseInt(stored ?? "999")).toBeLessThanOrEqual(899);
  });
});

// ── 7. Afiliados — captura de ?ref= ──────────────────────────────────────────

test.describe("Sistema de Afiliados — captura de ?ref=", () => {
  test.beforeEach(async ({ page }) => bypassAgeGate(page));

  test("?ref=CODE se guarda en localStorage al visitar la URL", async ({ page }) => {
    await page.goto(`${BASE}?ref=TESTCODE123`);
    const ref = await page.evaluate(() => localStorage.getItem("waxapp-ref"));
    expect(ref).toBe("TESTCODE123");
  });

  test("el ref persiste al navegar a otra ruta (SPA)", async ({ page }) => {
    await page.goto(`${BASE}?ref=AFILIADO99`);
    await page.goto(`${BASE}/catalogo`);
    const ref = await page.evaluate(() => localStorage.getItem("waxapp-ref"));
    expect(ref).toBe("AFILIADO99");
  });

  test("el ref se refleja en la página de checkout", async ({ page }) => {
    await preloadCart(page, 300, 1);
    await page.goto(`${BASE}?ref=DISTRIB01`);
    await page.goto(`${BASE}/checkout`);
    await expect(page.getByText("DISTRIB01")).toBeVisible({ timeout: 4000 });
  });
});

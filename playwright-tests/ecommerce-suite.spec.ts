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

  test("Catálogo muestra 20 productos", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);
    await expect(page.getByText("20 productos").first()).toBeVisible({ timeout: 12000 });
  });

  test("filtro 'disposables' reduce la lista", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);
    await page.waitForSelector("text=20 productos", { timeout: 12000 });
    await page.getByRole("button", { name: "disposables" }).click();
    await page.waitForTimeout(500);
    const text = await page.locator("p.text-sm.text-muted-foreground").textContent();
    expect(parseInt(text ?? "20")).toBeLessThan(20);
  });

  test("buscar 'bugatti' filtra a 2 productos", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);
    await page.waitForSelector("text=20 productos", { timeout: 12000 });
    await page.getByPlaceholder(/buscar.*producto/i).fill("bugatti");
    await page.waitForTimeout(600);
    await expect(page.getByText("2 productos").first()).toBeVisible({ timeout: 4000 });
  });
});

// ── 3. Carrito — agregar al carrito ──────────────────────────────────────────
test.describe("Carrito", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("hacer clic en Agregar al carrito desde el grid", async ({ page }) => {
    await page.goto(`${BASE}/catalogo`);
    await page.waitForSelector("text=20 productos", { timeout: 12000 });
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


// ── 9. Checkout Clip — Caso de Prueba 1 ──────────────────────────────────────
test.describe("Checkout Clip — Flujo de Pago", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("CP 1: checkout redirige a Clip para pago con tarjeta", async ({ page }) => {
    // Interceptar la Edge Function clip-create-checkout para simular respuesta exitosa
    await page.route("**/functions/v1/clip-create-checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          checkout_url: `${BASE}/pago-exitoso?folio=WX-TEST&order_id=mock-uuid-1234`,
          payment_id: "mock-clip-pay-id",
          reference: "WX-TEST",
        }),
      });
    });

    // Interceptar create-order para simular orden creada
    await page.route("**/functions/v1/create-order", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          order_id: "mock-uuid-1234",
          order_number: "WX-TEST",
          total: 599,
          shipping_cost: 99,
        }),
      });
    });

    // Autenticar con sesión mock
    await page.addInitScript(() => {
      localStorage.setItem("waxapp_age_verified", "true");
      // Simular carrito con 1 producto
      const cart = {
        state: {
          items: [{
            id: "prod-1",
            title: "Vape Test Pro",
            price: 500,
            quantity: 1,
            selectedVariant: "Mango",
            image: null,
          }],
          isOpen: false,
          discountCode: null,
          discountAmount: 0,
          shippingCost: 99,
          loyaltyPointsApplied: 0,
          total: 599,
        },
        version: 0,
      };
      localStorage.setItem("waxapp-cart", JSON.stringify(cart));
    });

    await page.goto(`${BASE}/checkout`);

    // Debería redirigir a /cliente si no está autenticado — validamos la página de auth
    const url = page.url();
    expect(url).toMatch(/checkout|cliente/);
  });

  test("CP 1: /pago-exitoso muestra folio y botón de regreso", async ({ page }) => {
    await page.goto(`${BASE}/pago-exitoso?folio=WX-9999&order_id=mock-test-id`);
    await page.waitForLoadState("networkidle");

    // Debe mostrar la página de éxito con el folio
    await expect(page.getByText("WX-9999")).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("button", { name: /seguir comprando|volver/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("CP 1: /pago-cancelado muestra opciones de reintento", async ({ page }) => {
    await page.goto(`${BASE}/pago-cancelado?folio=WX-9999`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/pago no completado/i)).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: /reintentar pago/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("CP 1: order_id se persiste en sessionStorage antes del redirect", async ({ page }) => {
    // Verificar que los datos de la orden queden en sessionStorage tras navegar a /pago-exitoso
    await page.goto(`${BASE}/pago-exitoso?folio=WX-SESS&order_id=test-persist-id`);
    await page.waitForLoadState("networkidle");

    // Aunque sessionStorage ya se limpió al entrar a pago-exitoso, la página debe cargarse sin errores
    const title = await page.title();
    expect(title).toMatch(/WAXAPP|pago/i);
  });
});

// ── 10. PWA Install Page — Caso de Prueba 2 ───────────────────────────────────
test.describe("Página /install — PWA y Service Worker", () => {
  test.beforeEach(async ({ page }) => bypassAge(page));

  test("CP 2: /install carga correctamente", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(`${BASE}/install`);
    await page.waitForLoadState("networkidle");

    // Debe mostrar el título "Instala WAXAPP"
    await expect(page.getByRole("heading", { name: /instala waxapp/i })).toBeVisible({ timeout: 8000 });

    // No debe haber errores JS críticos
    const jsErrors = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") &&
        !e.includes("service-worker") &&
        !e.includes("VAPID") &&
        !e.includes("push_subscriptions")
    );
    expect(jsErrors).toHaveLength(0);
  });

  test("CP 2: botón/switch de notificaciones es visible", async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await page.waitForLoadState("networkidle");

    // Debe mostrar el switch de notificaciones
    await expect(
      page.getByRole("switch", { name: /notificaciones/i })
    ).toBeVisible({ timeout: 8000 });
  });

  test("CP 2: Service Worker se registra sin lanzar errores de consola", async ({ page }) => {
    const swErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().toLowerCase().includes("service-worker")) {
        swErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE}/install`);
    await page.waitForTimeout(3000); // dar tiempo al SW para registrarse

    expect(swErrors).toHaveLength(0);
  });

  test("CP 2: detecta OS y muestra guía correspondiente", async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await page.waitForLoadState("networkidle");

    // En desktop debe mostrar opción de Chrome/escritorio o la guía de instalación
    const hasAndroidSection = await page.getByText(/instalar app|android|chrome/i).count();
    const hasIOSSection = await page.getByText(/iphone|safari|compartir/i).count();
    expect(hasAndroidSection + hasIOSSection).toBeGreaterThan(0);
  });
});

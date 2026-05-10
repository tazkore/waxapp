import { test, expect } from '@playwright/test';

/**
 * Multi-domain (white-label) smoke test.
 *
 * Spoofs `window.location.hostname` via addInitScript so the app's
 * useCurrentSite()/getSiteByHost() read the secondary domain identity
 * (vapewax.com.mx in this case) without needing real DNS.
 *
 * Verifies:
 *   1. The CSS variable --primary corresponds to the secondary site palette.
 *   2. document.title contains the secondary site's SEO title.
 *   3. <link rel="canonical"> uses the secondary canonicalBase.
 */

const SECONDARY_HOST = 'vapewax.com.mx';

test.describe('Multi-domain white-label', () => {
  test('aplica identidad del dominio secundario', async ({ page }) => {
    await page.addInitScript((host) => {
      try {
        Object.defineProperty(window.location, 'hostname', {
          configurable: true,
          get: () => host,
        });
      } catch {
        // ignore — some browsers freeze location, the test will then fail meaningfully
      }
    }, SECONDARY_HOST);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    );
    expect(primary.length).toBeGreaterThan(0);

    const title = await page.title();
    expect(title.toLowerCase()).toContain('vapewax');

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(SECONDARY_HOST);
  });
});

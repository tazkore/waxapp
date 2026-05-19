/**
 * WAXAPP Product Scraper Adapters
 * Each adapter extracts structured product data from raw HTML.
 * Used by the SiteImporterSection and edge functions.
 */

export interface ScrapedProduct {
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  image_url: string | null;
  category: string | null;
  source_url?: string;
}

export interface ProductAdapter {
  name: string;
  matches: (hostname: string) => boolean;
  extract: (html: string, url: string) => ScrapedProduct[];
}

// ─── JSON-LD extractor (works on most modern e-commerce sites) ────────
export function extractJsonLd(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const items: any[] = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item['@type'] !== 'Product') continue;
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        products.push({
          name: String(item.name ?? '').slice(0, 200),
          description: item.description ? String(item.description).slice(0, 2000) : null,
          price: offer?.price != null ? parseFloat(offer.price) : null,
          sku: item.sku || item.mpn || null,
          image_url: Array.isArray(item.image) ? item.image[0] : item.image || null,
          category: item.category || null,
        });
      }
    } catch { /* invalid JSON-LD */ }
  }
  return products;
}

// ─── OG / meta extractor (fallback) ──────────────────────────────────
export function extractOgMeta(html: string): ScrapedProduct | null {
  const get = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
              html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'));
    return m ? m[1] : null;
  };
  const getMeta = (name: string) => {
    const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'));
    return m ? m[1] : null;
  };
  const title = get('og:title') || getMeta('title');
  if (!title) return null;
  const priceMatch = html.match(/["']price["']\s*:\s*["']?(\d+(?:\.\d+)?)["']?/i);
  return {
    name: title.slice(0, 200),
    description: get('og:description') || getMeta('description'),
    price: priceMatch ? parseFloat(priceMatch[1]) : null,
    sku: null,
    image_url: get('og:image'),
    category: get('og:type') === 'product' ? null : null,
  };
}

// ─── Adapter: Evapemayoreo.com ────────────────────────────────────────
const evapemayoreoAdapter: ProductAdapter = {
  name: 'evapemayoreo',
  matches: (hostname) => hostname.includes('evapemayoreo'),
  extract: (html, url) => {
    // First try JSON-LD
    const ld = extractJsonLd(html);
    if (ld.length > 0) return ld;

    // Heuristic: extract from product cards
    const products: ScrapedProduct[] = [];
    const cardRegex = /<(?:div|article|li)[^>]+class="[^"]*(?:product|card|item)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi;
    let cardMatch;
    while ((cardMatch = cardRegex.exec(html)) !== null) {
      const card = cardMatch[1];
      const nameMatch = card.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
      const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : null;
      if (!name || name.length < 3) continue;
      const priceMatch = card.match(/\$\s*([\d,]+(?:\.\d+)?)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;
      const imgMatch = card.match(/src=["']([^"']+\.(jpg|png|webp)[^"']*)["']/i);
      products.push({
        name: name.slice(0, 200),
        description: null,
        price,
        sku: null,
        image_url: imgMatch ? imgMatch[1] : null,
        category: null,
        source_url: url,
      });
    }
    return products;
  },
};

// ─── Adapter: Generic Shopify ─────────────────────────────────────────
const shopifyAdapter: ProductAdapter = {
  name: 'shopify',
  matches: (hostname) => hostname.includes('myshopify') || hostname.includes('shopify'),
  extract: (html, url) => {
    const match = html.match(/var meta = ({[\s\S]*?});/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (meta?.product) {
          const p = meta.product;
          return [{
            name: p.title,
            description: p.description ? p.description.replace(/<[^>]+>/g, '').trim().slice(0, 2000) : null,
            price: p.price ? p.price / 100 : null,
            sku: p.variants?.[0]?.sku || null,
            image_url: p.featured_image || null,
            category: p.type || null,
            source_url: url,
          }];
        }
      } catch { /* ignore */ }
    }
    // Fallback to JSON-LD
    return extractJsonLd(html).map((p) => ({ ...p, source_url: url }));
  },
};

// ─── Adapter: WooCommerce ─────────────────────────────────────────────
const woocommerceAdapter: ProductAdapter = {
  name: 'woocommerce',
  matches: (hostname) => false, // Detect by HTML content instead
  extract: (html, url) => {
    if (!html.includes('woocommerce') && !html.includes('wc-product')) return [];
    const ld = extractJsonLd(html);
    if (ld.length > 0) return ld.map((p) => ({ ...p, source_url: url }));
    return [];
  },
};

// ─── Adapter: Generic (catch-all) ────────────────────────────────────
const genericAdapter: ProductAdapter = {
  name: 'generic',
  matches: () => true,
  extract: (html, url) => {
    // 1. JSON-LD (best)
    const ld = extractJsonLd(html);
    if (ld.length > 0) return ld.map((p) => ({ ...p, source_url: url }));

    // 2. OG meta (product pages)
    const og = extractOgMeta(html);
    if (og) return [{ ...og, source_url: url }];

    return [];
  },
};

// ─── Registry ─────────────────────────────────────────────────────────
const ADAPTERS: ProductAdapter[] = [
  evapemayoreoAdapter,
  shopifyAdapter,
  woocommerceAdapter,
  genericAdapter,
];

/**
 * Auto-selects the best adapter for a URL and extracts products from HTML.
 */
export function extractProductsFromHtml(html: string, url: string): ScrapedProduct[] {
  let hostname = '';
  try { hostname = new URL(url).hostname.toLowerCase(); } catch { /* ignore */ }

  for (const adapter of ADAPTERS) {
    if (adapter.matches(hostname)) {
      const results = adapter.extract(html, url);
      if (results.length > 0) return results;
    }
  }

  // Final fallback: generic
  return genericAdapter.extract(html, url);
}

/**
 * Returns the adapter name that would handle this URL.
 */
export function detectAdapter(url: string): string {
  let hostname = '';
  try { hostname = new URL(url).hostname.toLowerCase(); } catch { /* ignore */ }
  for (const adapter of ADAPTERS) {
    if (adapter.matches(hostname)) return adapter.name;
  }
  return 'generic';
}

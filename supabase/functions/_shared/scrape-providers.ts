// Shared multi-provider scraping helpers used by firecrawl-* edge functions.
// Providers: 'firecrawl' | 'jina' | 'scrapingbee' | 'readability'
// 'jina' and 'readability' do NOT require an API key and are FREE.

export type Provider = "firecrawl" | "jina" | "scrapingbee" | "readability";

export interface ScrapeResult {
  html?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}

const FIRECRAWL_BASE = "https://api.firecrawl.dev";

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; WaxappBot/1.0; +https://waxapp.mx)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es,en;q=0.8",
};

export async function providerScrape(
  provider: Provider,
  url: string,
): Promise<ScrapeResult> {
  if (provider === "firecrawl") {
    const KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!KEY) throw new Error("FIRECRAWL_API_KEY missing");
    const r = await fetch(`${FIRECRAWL_BASE}/v2/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "html"] }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Firecrawl scrape [${r.status}]: ${JSON.stringify(j).slice(0, 300)}`);
    const d = j.data ?? j;
    return { html: d.html, markdown: d.markdown, metadata: d.metadata };
  }

  if (provider === "jina") {
    // Jina Reader is FREE without key (rate-limited). Returns markdown by default.
    const KEY = Deno.env.get("JINA_API_KEY");
    const headers: Record<string, string> = { ...COMMON_HEADERS, Accept: "text/markdown" };
    if (KEY) headers.Authorization = `Bearer ${KEY}`;
    const r = await fetch(`https://r.jina.ai/${url}`, { headers });
    if (!r.ok) throw new Error(`Jina scrape [${r.status}]`);
    const markdown = await r.text();
    return { markdown };
  }

  if (provider === "scrapingbee") {
    const KEY = Deno.env.get("SCRAPINGBEE_API_KEY");
    if (!KEY) throw new Error("SCRAPINGBEE_API_KEY missing — añade el secret para usar ScrapingBee");
    const u = `https://app.scrapingbee.com/api/v1/?api_key=${KEY}&url=${encodeURIComponent(url)}&render_js=true`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`ScrapingBee scrape [${r.status}]`);
    const html = await r.text();
    return { html };
  }

  if (provider === "readability") {
    // Free, no API key. Direct fetch + simple HTML→markdown extraction.
    const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow" });
    if (!r.ok) throw new Error(`Readability fetch [${r.status}]`);
    const html = await r.text();
    return { html, markdown: htmlToText(html) };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function providerMap(
  provider: Provider,
  url: string,
  limit = 100,
): Promise<string[]> {
  if (provider === "firecrawl") {
    const KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!KEY) throw new Error("FIRECRAWL_API_KEY missing");
    const r = await fetch(`${FIRECRAWL_BASE}/v2/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, limit, includeSubdomains: false }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Firecrawl map [${r.status}]: ${JSON.stringify(j).slice(0, 300)}`);
    const raw = j.links || j.data?.links || [];
    return raw.map((x: any) => (typeof x === "string" ? x : x?.url)).filter(Boolean);
  }

  // jina / scrapingbee / readability: scrape root + extract links of same hostname
  const { html } = await providerScrape(provider, url);
  if (!html) {
    // Jina returns markdown only — try sitemap fallback for link discovery
    return await sitemapDiscovery(url, limit);
  }
  return extractSameHostLinks(html, url, limit);
}

export function extractSameHostLinks(html: string, baseUrl: string, limit: number): string[] {
  const base = new URL(baseUrl);
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base);
      if (abs.hostname === base.hostname) links.add(abs.toString().split("#")[0]);
      if (links.size >= limit) break;
    } catch {
      /* skip */
    }
  }
  return [...links];
}

export async function sitemapDiscovery(url: string, limit: number): Promise<string[]> {
  try {
    const base = new URL(url);
    const r = await fetch(`${base.origin}/sitemap.xml`, { headers: COMMON_HEADERS });
    if (!r.ok) return [];
    const xml = await r.text();
    const out: string[] = [];
    const re = /<loc>([^<]+)<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      out.push(m[1]);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Quick HTML→plain-text used by 'readability' provider when we don't have AI/Firecrawl.
 * Strips scripts/styles/nav/footer and collapses whitespace.
 */
export function htmlToText(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

/**
 * Heuristic product extraction from raw HTML (no AI). Reads JSON-LD, OpenGraph and microdata.
 * Returns null if it doesn't look like a product page.
 */
export function extractProductFromHtml(html: string, sourceUrl: string): {
  is_product_page: boolean;
  name?: string;
  description?: string;
  price?: number;
  sku?: string;
  category?: string;
  images?: string[];
  gtin?: string;
  brand?: string;
} | null {
  const result: any = { is_product_page: false, images: [] };

  // 1) JSON-LD Product
  const jsonLdRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const arr = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const node of arr) {
        const types = ([] as string[]).concat(node["@type"] || []);
        if (types.includes("Product")) {
          result.is_product_page = true;
          result.name = node.name || result.name;
          result.description = node.description || result.description;
          result.sku = node.sku || result.sku;
          result.gtin = node.gtin13 || node.gtin || node.gtin12 || result.gtin;
          result.brand =
            (typeof node.brand === "string" ? node.brand : node.brand?.name) || result.brand;
          if (node.image) {
            const imgs = Array.isArray(node.image) ? node.image : [node.image];
            result.images.push(...imgs.filter((x: any) => typeof x === "string"));
          }
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          if (offers?.price) result.price = Number(offers.price) || result.price;
          const cat = node.category;
          if (cat) result.category = typeof cat === "string" ? cat : cat?.name;
        }
      }
    } catch {
      /* malformed JSON-LD, skip */
    }
  }

  // 2) OpenGraph fallback
  const og = (prop: string) => {
    const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
    return html.match(re)?.[1];
  };
  const ogType = og("og:type");
  if (ogType && /product/i.test(ogType)) result.is_product_page = true;
  result.name = result.name || og("og:title");
  result.description = result.description || og("og:description");
  const ogImg = og("og:image");
  if (ogImg && !result.images.includes(ogImg)) result.images.push(ogImg);
  if (!result.price) {
    const p = og("product:price:amount") || og("og:price:amount");
    if (p) result.price = Number(p);
  }

  // 3) Title fallback
  if (!result.name) {
    const t = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    if (t) result.name = t.trim();
  }

  // Resolve relative image URLs
  try {
    const base = new URL(sourceUrl);
    result.images = result.images
      .map((img: string) => {
        try {
          return new URL(img, base).toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    /* ignore */
  }

  // Heuristic confirmation: must have a name AND (price or product hint URL)
  if (!result.is_product_page) {
    if (result.name && (result.price || /\/(product|producto|p|item)[\/-]/i.test(sourceUrl))) {
      result.is_product_page = true;
    }
  }

  if (!result.is_product_page) return null;
  return result;
}

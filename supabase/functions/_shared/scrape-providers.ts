// Shared multi-provider scraping helpers used by firecrawl-* edge functions.
// Providers: 'firecrawl' | 'jina' | 'scrapingbee'
// Each provider fetches HTML/markdown for a URL and we extract links/data uniformly.

export type Provider = "firecrawl" | "jina" | "scrapingbee";

export interface ScrapeResult {
  html?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}

const FIRECRAWL_BASE = "https://api.firecrawl.dev";

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
    if (!r.ok) throw new Error(`Firecrawl scrape [${r.status}]: ${JSON.stringify(j)}`);
    const d = j.data ?? j;
    return { html: d.html, markdown: d.markdown, metadata: d.metadata };
  }

  if (provider === "jina") {
    const KEY = Deno.env.get("JINA_API_KEY");
    const headers: Record<string, string> = { Accept: "text/html" };
    if (KEY) headers.Authorization = `Bearer ${KEY}`;
    // Jina Reader returns clean markdown; ask for HTML via X-Return-Format
    headers["X-Return-Format"] = "html";
    const r = await fetch(`https://r.jina.ai/${url}`, { headers });
    if (!r.ok) throw new Error(`Jina scrape [${r.status}]`);
    const html = await r.text();
    return { html };
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
    if (!r.ok) throw new Error(`Firecrawl map [${r.status}]: ${JSON.stringify(j)}`);
    return j.links || j.data?.links || [];
  }

  // For Jina / ScrapingBee: scrape root + extract <a href> with same hostname
  const { html } = await providerScrape(provider, url);
  if (!html) return [];
  const base = new URL(url);
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base);
      if (abs.hostname === base.hostname) links.add(abs.toString().split("#")[0]);
      if (links.size >= limit) break;
    } catch { /* skip */ }
  }
  return [...links];
}

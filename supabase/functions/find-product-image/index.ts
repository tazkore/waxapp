// find-product-image: Cascade image search with multiple providers and configurable priority.
//
// Default priority (when keys are present, otherwise skipped automatically):
//   1) OpenFoodFacts  (GTIN, no key)
//   2) Wikimedia      (no key)
//   3) Google CSE     (GOOGLE_CSE_KEY + GOOGLE_CSE_CX)
//   4) SerpAPI        (SERPAPI_KEY)
//   5) Bing Images    (BING_IMAGE_KEY)
//   6) Unsplash       (UNSPLASH_ACCESS_KEY)
//   7) Pexels         (PEXELS_API_KEY)
//   8) Pixabay        (PIXABAY_KEY)
//   9) DuckDuckGo     (no key, scrape)
//  10) Lovable AI     (LOVABLE_API_KEY) — generation fallback
//
// Body: { name, brand?, category?, gtin?, count?, providers?: string[], includeAi?: boolean }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const isImg = (u: string) =>
  typeof u === "string" && /^https?:\/\//.test(u) && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u);

const dedup = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

// ---------- Providers ----------

async function fromOpenFoodFacts(gtin: string): Promise<string[]> {
  if (!gtin || gtin.length < 8) return [];
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`);
    if (!r.ok) return [];
    const j = await r.json();
    const p = j?.product;
    if (!p) return [];
    return dedup(
      [p.image_url, p.image_front_url, p.image_ingredients_url, p.image_packaging_url].filter(
        (u: any) => typeof u === "string" && u.startsWith("http"),
      ),
    );
  } catch {
    return [];
  }
}

async function fromWikimedia(query: string, count: number): Promise<string[]> {
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search` +
      `&gsrnamespace=6&gsrlimit=${count}&gsrsearch=${encodeURIComponent(query)}` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`;
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const j = await r.json();
    const pages = j?.query?.pages ?? {};
    const urls: string[] = [];
    for (const k of Object.keys(pages)) {
      const ii = pages[k]?.imageinfo?.[0];
      const u = ii?.thumburl || ii?.url;
      if (u) urls.push(u);
    }
    return dedup(urls).slice(0, count);
  } catch {
    return [];
  }
}

async function fromGoogleCse(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("GOOGLE_CSE_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_CX");
  if (!key || !cx) return [];
  try {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}` +
      `&searchType=image&num=${Math.min(count, 10)}&safe=active&q=${encodeURIComponent(query)}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.items ?? []).map((it: any) => it?.link).filter(isImg)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromSerpApi(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("SERPAPI_KEY");
  if (!key) return [];
  try {
    const url =
      `https://serpapi.com/search.json?engine=google_images&num=${count}` +
      `&q=${encodeURIComponent(query)}&api_key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.images_results ?? []).map((it: any) => it?.original).filter(isImg)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromBing(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("BING_IMAGE_KEY");
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.bing.microsoft.com/v7.0/images/search?count=${count}&q=${encodeURIComponent(query)}&safeSearch=Strict`,
      { headers: { "Ocp-Apim-Subscription-Key": key } },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.value ?? []).map((it: any) => it?.contentUrl).filter(isImg)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromUnsplash(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?per_page=${count}&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.results ?? []).map((it: any) => it?.urls?.regular).filter(Boolean)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromPexels(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?per_page=${count}&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: key } },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.photos ?? []).map((it: any) => it?.src?.large).filter(Boolean)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromPixabay(query: string, count: number): Promise<string[]> {
  const key = Deno.env.get("PIXABAY_KEY");
  if (!key) return [];
  try {
    const r = await fetch(
      `https://pixabay.com/api/?key=${key}&per_page=${Math.max(count, 3)}&image_type=photo&q=${encodeURIComponent(query)}`,
    );
    if (!r.ok) return [];
    const j = await r.json();
    return dedup((j?.hits ?? []).map((it: any) => it?.largeImageURL).filter(Boolean)).slice(0, count);
  } catch {
    return [];
  }
}

async function fromDuckDuckGo(query: string, count: number): Promise<string[]> {
  try {
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": UA } },
    );
    const html = await tokenRes.text();
    const vqd = html.match(/vqd=["']?([\d-]+)["']?/)?.[1] ?? html.match(/vqd=([\d-]+)&/)?.[1];
    if (!vqd) return [];
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
      { headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/", Accept: "application/json" } },
    );
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    const results: any[] = data?.results ?? [];
    return dedup(results.map((r) => r.image).filter(isImg)).slice(0, count);
  } catch (e) {
    console.error("ddg error", e);
    return [];
  }
}

async function fromAi(query: string): Promise<string[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate a clean professional product photo of: ${query}. White studio background, centered, high quality, no text, no watermark.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      console.error("AI image gen failed", r.status, await r.text());
      return [];
    }
    const d = await r.json();
    const url = d?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url ? [url] : [];
  } catch (e) {
    console.error("ai err", e);
    return [];
  }
}

// ---------- Registry ----------

type ProviderId =
  | "openfoodfacts"
  | "wikimedia"
  | "google_cse"
  | "serpapi"
  | "bing"
  | "unsplash"
  | "pexels"
  | "pixabay"
  | "duckduckgo"
  | "ai_generated";

const DEFAULT_ORDER: ProviderId[] = [
  "openfoodfacts",
  "wikimedia",
  "google_cse",
  "serpapi",
  "bing",
  "unsplash",
  "pexels",
  "pixabay",
  "duckduckgo",
];

// ---------- Validation ----------

type ValidateOpts = {
  minBytes: number;
  maxBytes: number;
  allowedTypes: string[]; // ["jpeg","png",...]
  timeoutMs: number;
};

type Rejected = { url: string; reason: string };

const DEFAULT_VALIDATE: ValidateOpts = {
  minBytes: 3072,
  maxBytes: 10 * 1024 * 1024,
  allowedTypes: ["jpeg", "jpg", "png", "webp", "gif", "avif"],
  timeoutMs: 4000,
};

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

function checkHeaders(
  headers: Headers,
  status: number,
  opts: ValidateOpts,
): string | null {
  if (status < 200 || status >= 300) return `http:${status}`;
  const ct = (headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
  const m = ct.match(/^image\/([a-z0-9.+-]+)$/);
  if (!m) return `content-type:${ct || "unknown"}`;
  const subtype = m[1] === "jpg" ? "jpeg" : m[1];
  if (!opts.allowedTypes.includes(subtype) && !opts.allowedTypes.includes(m[1])) {
    return `content-type:${ct}`;
  }
  const cl = parseInt(headers.get("content-length") || "0", 10);
  if (cl > 0) {
    if (cl < opts.minBytes) return `too-small:${cl}`;
    if (cl > opts.maxBytes) return `too-large:${cl}`;
  }
  return null;
}

async function validateImageUrl(url: string, opts: ValidateOpts): Promise<string | null> {
  // Data URLs (AI generation) — accept images only
  if (url.startsWith("data:image/")) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "bad-url";
  } catch {
    return "bad-url";
  }

  // Try HEAD first
  const head = withTimeout(opts.timeoutMs);
  try {
    const r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: head.signal,
      headers: { "User-Agent": UA, Accept: "image/*" },
    });
    head.cancel();
    if (r.status !== 405 && r.status !== 501) {
      const issue = checkHeaders(r.headers, r.status, opts);
      if (issue && !issue.startsWith("too-small:0")) return issue;
      // If content-length missing, fall through to GET range
      if (r.headers.get("content-length")) return null;
    }
  } catch (e: any) {
    head.cancel();
    if (e?.name === "AbortError") return "timeout";
    // Some hosts reject HEAD; fall back to GET
  }

  // Fallback: GET with Range to fetch only first bytes
  const get = withTimeout(opts.timeoutMs);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: get.signal,
      headers: { "User-Agent": UA, Accept: "image/*", Range: "bytes=0-2047" },
    });
    get.cancel();
    const issue = checkHeaders(r.headers, r.status === 206 ? 200 : r.status, opts);
    // Drain a small chunk to release connection (best-effort)
    try { await r.body?.cancel(); } catch { /* noop */ }
    if (issue) return issue;
    return null;
  } catch (e: any) {
    get.cancel();
    if (e?.name === "AbortError") return "timeout";
    return "network";
  }
}

async function validateImages(
  urls: string[],
  opts: ValidateOpts,
): Promise<{ valid: string[]; rejected: Rejected[] }> {
  if (!urls.length) return { valid: [], rejected: [] };
  const results = await Promise.allSettled(urls.map((u) => validateImageUrl(u, opts)));
  const valid: string[] = [];
  const rejected: Rejected[] = [];
  results.forEach((res, i) => {
    const url = urls[i];
    if (res.status === "fulfilled") {
      if (res.value === null) valid.push(url);
      else rejected.push({ url, reason: res.value });
    } else {
      rejected.push({ url, reason: "network" });
    }
  });
  return { valid, rejected };
}

async function runProvider(id: ProviderId, ctx: { query: string; gtin: string; count: number }): Promise<string[]> {
  switch (id) {
    case "openfoodfacts": return fromOpenFoodFacts(ctx.gtin);
    case "wikimedia":     return fromWikimedia(ctx.query, ctx.count);
    case "google_cse":    return fromGoogleCse(ctx.query, ctx.count);
    case "serpapi":       return fromSerpApi(ctx.query, ctx.count);
    case "bing":          return fromBing(ctx.query, ctx.count);
    case "unsplash":      return fromUnsplash(ctx.query, ctx.count);
    case "pexels":        return fromPexels(ctx.query, ctx.count);
    case "pixabay":       return fromPixabay(ctx.query, ctx.count);
    case "duckduckgo":    return fromDuckDuckGo(ctx.query, ctx.count);
    case "ai_generated":  return fromAi(ctx.query);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch {
    return json({ error: { code: "INVALID_BODY", message: "JSON required" } }, 400);
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return json({ error: { code: "INVALID_BODY", message: "name (1-200 chars) required" } }, 400);
  }
  const brand = typeof body?.brand === "string" ? body.brand.trim().slice(0, 100) : "";
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 100) : "";
  const gtin = typeof body?.gtin === "string" ? body.gtin.replace(/\D/g, "").slice(0, 14) : "";
  const count = Math.min(Math.max(Number(body?.count) || 5, 1), 10);
  const includeAi = body?.includeAi !== false;
  const validate = body?.validate !== false;
  const validateOpts: ValidateOpts = {
    minBytes: Math.max(0, Number(body?.minBytes) || DEFAULT_VALIDATE.minBytes),
    maxBytes: Math.max(1024, Number(body?.maxBytes) || DEFAULT_VALIDATE.maxBytes),
    allowedTypes: Array.isArray(body?.allowedTypes) && body.allowedTypes.length
      ? body.allowedTypes.map((t: any) => String(t).toLowerCase())
      : DEFAULT_VALIDATE.allowedTypes,
    timeoutMs: DEFAULT_VALIDATE.timeoutMs,
  };
  const customOrder: ProviderId[] | null = Array.isArray(body?.providers) && body.providers.length
    ? body.providers.filter((x: any) => typeof x === "string") as ProviderId[]
    : null;

  const queryParts = [name, brand, category, "product"].filter(Boolean);
  const query = queryParts.join(" ");
  const ctx = { query, gtin, count };

  const order = customOrder ?? DEFAULT_ORDER;
  const tried: Array<{ provider: ProviderId; found: number; valid?: number; rejected?: Rejected[] }> = [];

  for (const id of order) {
    const imgs = await runProvider(id, ctx);
    if (!imgs.length) {
      tried.push({ provider: id, found: 0, valid: 0 });
      continue;
    }
    if (!validate) {
      tried.push({ provider: id, found: imgs.length });
      return json({ images: imgs.slice(0, count), source: id, query, validated: false, tried });
    }
    const { valid, rejected } = await validateImages(imgs, validateOpts);
    tried.push({
      provider: id,
      found: imgs.length,
      valid: valid.length,
      ...(rejected.length ? { rejected: rejected.slice(0, 3) } : {}),
    });
    if (valid.length) {
      return json({ images: valid.slice(0, count), source: id, query, validated: true, tried });
    }
    // 0 válidas → reintenta con siguiente proveedor
  }

  if (includeAi) {
    const ai = await runProvider("ai_generated", ctx);
    tried.push({ provider: "ai_generated", found: ai.length, valid: ai.length });
    if (ai.length) return json({ images: ai, source: "ai_generated", query, validated: false, tried });
  }

  return json({ images: [], source: "none", query, tried });
});

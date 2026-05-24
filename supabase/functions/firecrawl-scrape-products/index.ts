// firecrawl-scrape-products: extract products from a list of URLs.
// Supports preview mode (1-2 URLs, no DB writes), multiple providers
// (firecrawl/jina/scrapingbee/readability), AI optional fallback to JSON-LD/OG.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  providerScrape,
  extractProductFromHtml,
  type Provider,
} from "../_shared/scrape-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const PRODUCT_TOOL = {
  type: "function",
  function: {
    name: "extract_product",
    description: "Extract structured product data from a page",
    parameters: {
      type: "object",
      properties: {
        is_product_page: { type: "boolean", description: "True if the page is a product detail page" },
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "number", description: "Numeric price in MXN, no currency symbol" },
        sku: { type: "string" },
        category: { type: "string" },
        brand: { type: "string" },
        gtin: { type: "string" },
        images: { type: "array", items: { type: "string" }, description: "Absolute image URLs of the product" },
      },
      required: ["is_product_page"],
      additionalProperties: false,
    },
  },
};

type ErrCode =
  | "INVALID_BODY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROVIDER_FAIL"
  | "AI_FAIL"
  | "DB_FAIL"
  | "INTERNAL";

const errorResponse = (code: ErrCode, message: string, status = 400, details?: unknown) =>
  new Response(JSON.stringify({ error: { code, message, details } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const isHttpUrl = (s: unknown): s is string => {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const VALID_PROVIDERS: Provider[] = [
  "firecrawl",
  "jina",
  "scrapingbee",
  "readability",
  "browserless",
  "scraperapi",
  "scrapfly",
  "diffbot",
  "zenrows",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_BODY", "Body must be valid JSON");
  }

  const { job_id, urls, provider = "firecrawl", preview = false, use_ai = true } = body ?? {};

  // ---- Validate body ----
  if (!Array.isArray(urls) || urls.length === 0) {
    return errorResponse("INVALID_BODY", "urls[] is required (1..30 valid URLs)");
  }
  if (urls.length > 30) {
    return errorResponse("INVALID_BODY", `Too many URLs (${urls.length}). Max is 30.`);
  }
  const invalidUrls = urls.filter((u: unknown) => !isHttpUrl(u));
  if (invalidUrls.length) {
    return errorResponse("INVALID_BODY", "Some URLs are invalid", 400, { invalid: invalidUrls });
  }
  if (job_id && !isUuid(job_id)) {
    return errorResponse("INVALID_BODY", "job_id must be a UUID");
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    return errorResponse("INVALID_BODY", `provider must be one of: ${VALID_PROVIDERS.join(", ")}`);
  }
  if (typeof preview !== "boolean" || typeof use_ai !== "boolean") {
    return errorResponse("INVALID_BODY", "preview and use_ai must be boolean");
  }

  // ---- Auth ----
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON || !SERVICE) {
    return errorResponse("INTERNAL", "Supabase env not configured", 500);
  }
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: ures } = await userClient.auth.getUser();
  if (!ures?.user) return errorResponse("UNAUTHORIZED", "You must be signed in", 401);

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
  if (!roles?.some((r: any) => r.role === "super_admin" || r.role === "admin")) {
    return errorResponse("FORBIDDEN", "Admin role required", 403);
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const aiAvailable = Boolean(GEMINI_API_KEY) && use_ai;

  // Preview mode: cap to 2 URLs and never write to import_jobs
  const limited: string[] = preview ? urls.slice(0, 2) : urls.slice(0, 30);
  console.log(
    `[scrape-products] start job=${job_id ?? "preview"} provider=${provider} count=${limited.length} preview=${preview} ai=${aiAvailable}`,
  );

  // Update job → scraping
  if (job_id && !preview) {
    const { error: upErr } = await admin
      .from("import_jobs")
      .update({ status: "scraping", error: null })
      .eq("id", job_id);
    if (upErr) console.error("[scrape-products] DB update scraping failed:", upErr.message);
  }

  const products: any[] = [];
  const failures: Array<{ url: string; reason: string; tried: string[] }> = [];

  for (let i = 0; i < limited.length; i++) {
    const url = limited[i];
    const t0 = Date.now();
    const tried: string[] = [];
    let lastError = "";
    let scrape: Awaited<ReturnType<typeof providerScrape>> | null = null;
    let providerUsed: Provider = provider as Provider;

    // Try the requested provider, then fall back to Jina (free, no key) if it fails
    const fallbackChain: Provider[] =
      provider === "jina" ? ["jina"] : [provider as Provider, "jina"];

    for (const p of fallbackChain) {
      tried.push(p);
      try {
        scrape = await providerScrape(p, url);
        providerUsed = p;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.warn(`[scrape-products] provider=${p} failed for ${url}: ${lastError}`);
      }
    }

    if (!scrape) {
      failures.push({ url, reason: lastError || "All providers failed", tried });
      console.error(`[scrape-products] FAIL #${i} ${url}: ${lastError}`);
      continue;
    }

    try {
      const html = scrape.html ?? "";
      const markdown = scrape.markdown ?? "";

      let parsed: any = null;

      // 0) Diffbot fast-path
      const diffbot = (scrape.metadata as any)?.diffbot;
      if (diffbot?.objects?.[0]?.type === "product") {
        const o = diffbot.objects[0];
        parsed = {
          is_product_page: true,
          name: o.title,
          description: o.description || o.text,
          price: typeof o.offerPrice === "string" ? Number(o.offerPrice.replace(/[^\d.]/g, "")) : o.offerPrice,
          sku: o.sku,
          gtin: o.gtin13 || o.gtin12,
          brand: o.brand,
          category: Array.isArray(o.breadcrumb) ? o.breadcrumb[o.breadcrumb.length - 1]?.name : undefined,
          images: (o.images || []).map((im: any) => im?.url).filter(Boolean),
        };
      }

      // 1) Non-AI structured extraction (JSON-LD/OG)
      if (!parsed && html) parsed = extractProductFromHtml(html, url);

      // 2) AI fallback
      if (!parsed && aiAvailable && (markdown || html)) {
        try {
          const aiInput = markdown || html.slice(0, 14000);
          const aiRes = await fetch(AI_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gemini-2.0-flash",
              messages: [
                { role: "system", content: "You extract e-commerce product data from scraped page content. Only return is_product_page=true if this is clearly a product detail page (not a category, blog, or homepage). Image URLs must be absolute." },
                { role: "user", content: `URL: ${url}\n\nCONTENT:\n${aiInput.slice(0, 12000)}` },
              ],
              tools: [PRODUCT_TOOL],
              tool_choice: { type: "function", function: { name: "extract_product" } },
            }),
          });
          const aiData = await aiRes.json();
          if (!aiRes.ok) {
            console.error(`[scrape-products] AI [${aiRes.status}] for ${url}:`, JSON.stringify(aiData).slice(0, 200));
          } else {
            const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (args) parsed = typeof args === "string" ? JSON.parse(args) : args;
          }
        } catch (aiErr) {
          console.error(`[scrape-products] AI exception for ${url}:`, (aiErr as Error).message);
        }
      }

      if (parsed?.is_product_page && parsed.name) {
        products.push({ source_url: url, provider_used: providerUsed, ...parsed });
        console.log(`[scrape-products] OK #${i} ${url} via ${providerUsed} (${Date.now() - t0}ms)`);
      } else {
        failures.push({ url, reason: "No es una página de producto o falta el nombre", tried });
        console.log(`[scrape-products] SKIP #${i} ${url} (${Date.now() - t0}ms)`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ url, reason: msg, tried });
      console.error(`[scrape-products] FAIL #${i} ${url}: ${msg}`);
    }
  }

  // Update job → pending (extracted) or failed
  if (job_id && !preview) {
    const status = products.length > 0 ? "pending" : "failed";
    const { error: upErr } = await admin
      .from("import_jobs")
      .update({
        products_extracted: products.length,
        extracted_products: products,
        status,
        error: products.length === 0 && failures.length > 0
          ? `Sin productos extraídos. Primer error: ${failures[0].reason}`
          : null,
      })
      .eq("id", job_id);
    if (upErr) {
      console.error("[scrape-products] DB final update failed:", upErr.message);
      return errorResponse("DB_FAIL", "Failed to save extracted products", 500, upErr.message);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      preview,
      provider,
      attempted: limited.length,
      extracted: products.length,
      products,
      failures,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

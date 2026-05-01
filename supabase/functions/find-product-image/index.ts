// find-product-image: Cascade search for a product image without API keys.
// 1) OpenFoodFacts by GTIN -> 2) DuckDuckGo image scrape -> 3) Lovable AI generation
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

async function fromOpenFoodFacts(gtin: string): Promise<string[]> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`);
    if (!r.ok) return [];
    const j = await r.json();
    const p = j?.product;
    if (!p) return [];
    const urls = [p.image_url, p.image_front_url, p.image_ingredients_url, p.image_packaging_url]
      .filter((u: any) => typeof u === "string" && u.startsWith("http"));
    return Array.from(new Set(urls));
  } catch {
    return [];
  }
}

async function fromDuckDuckGo(query: string, count: number): Promise<string[]> {
  try {
    // Step 1: get vqd token
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": UA } },
    );
    const html = await tokenRes.text();
    const vqd = html.match(/vqd=["']?([\d-]+)["']?/)?.[1] ?? html.match(/vqd=([\d-]+)&/)?.[1];
    if (!vqd) return [];

    // Step 2: image json endpoint
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
      {
        headers: {
          "User-Agent": UA,
          Referer: "https://duckduckgo.com/",
          Accept: "application/json",
        },
      },
    );
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    const results: any[] = data?.results ?? [];
    return results
      .map((r) => r.image)
      .filter((u: string) => typeof u === "string" && /^https?:\/\//.test(u))
      .filter((u: string) => /\.(jpe?g|png|webp)(\?|$)/i.test(u))
      .slice(0, count);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "INVALID_BODY", message: "JSON required" } }, 400);
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return json({ error: { code: "INVALID_BODY", message: "name (1-200 chars) required" } }, 400);
  }
  const brand = typeof body?.brand === "string" ? body.brand.trim().slice(0, 100) : "";
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 100) : "";
  const gtin = typeof body?.gtin === "string" ? body.gtin.replace(/\D/g, "").slice(0, 14) : "";
  const count = Math.min(Math.max(Number(body?.count) || 5, 1), 5);

  const queryParts = [name, brand, category, "product"].filter(Boolean);
  const query = queryParts.join(" ");

  // 1) OpenFoodFacts (GTIN)
  if (gtin && gtin.length >= 8) {
    const off = await fromOpenFoodFacts(gtin);
    if (off.length) return json({ images: off.slice(0, count), source: "openfoodfacts", query });
  }

  // 2) DuckDuckGo
  const ddg = await fromDuckDuckGo(query, count);
  if (ddg.length) return json({ images: ddg, source: "duckduckgo", query });

  // 3) AI fallback (only if explicitly requested or no other results)
  const ai = await fromAi(query);
  if (ai.length) return json({ images: ai, source: "ai_generated", query });

  return json({ images: [], source: "none", query });
});

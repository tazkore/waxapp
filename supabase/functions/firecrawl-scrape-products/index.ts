import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
        images: { type: "array", items: { type: "string" }, description: "Absolute image URLs of the product" },
      },
      required: ["is_product_page"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
    if (!roles?.some((r: any) => r.role === "super_admin"))
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { job_id, urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) throw new Error("urls[] required");
    const limited = urls.slice(0, 30); // cap to avoid runaway cost

    if (job_id) {
      await admin.from("import_jobs").update({ status: "scraping" }).eq("id", job_id);
    }

    const products: any[] = [];
    for (const url of limited) {
      try {
        const fc = await fetch(`${FIRECRAWL_BASE}/v2/scrape`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const fcData = await fc.json();
        if (!fc.ok) {
          console.error("scrape failed", url, fcData);
          continue;
        }
        const markdown = fcData.markdown || fcData.data?.markdown || "";
        if (!markdown || markdown.length < 50) continue;

        const aiRes = await fetch(AI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You extract e-commerce product data from scraped page markdown. Only return is_product_page=true if this is clearly a product detail page (not a category, blog, or homepage). Image URLs must be absolute." },
              { role: "user", content: `URL: ${url}\n\nMARKDOWN:\n${markdown.slice(0, 12000)}` },
            ],
            tools: [PRODUCT_TOOL],
            tool_choice: { type: "function", function: { name: "extract_product" } },
          }),
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) {
          console.error("AI failed", aiData);
          continue;
        }
        const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) continue;
        const parsed = typeof args === "string" ? JSON.parse(args) : args;
        if (parsed.is_product_page && parsed.name) {
          products.push({ source_url: url, ...parsed });
        }
      } catch (e) {
        console.error("loop err", url, e);
      }
    }

    await admin
      .from("import_jobs")
      .update({ products_extracted: products.length, extracted_products: products, status: "pending" })
      .eq("id", job_id);

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-products error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { providerScrape, type Provider } from "../_shared/scrape-providers.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isSuper = (roles ?? []).some((r: any) => r.role === "super_admin");
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "Solo super admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, provider = "firecrawl" } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    // 1. Scrape page using selected provider
    let scraped;
    try {
      scraped = await providerScrape(provider as Provider, url);
    } catch (e) {
      console.error("scrape err", e);
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Scraping falló" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html: string = scraped.html ?? "";
    const md: string = scraped.markdown ?? "";
    const meta: any = scraped.metadata ?? {};

    // Snapshot HTML to extract obvious assets
    const snippet = (html || md).slice(0, 30000);

    // 2. Ask AI to extract a theme spec (HSL palette, fonts, tagline, hero copy)
    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un diseñador senior. Analiza el HTML/markdown y devuelve un design system completo en HSL." },
          { role: "user", content: `URL: ${url}\nTitle: ${meta.title ?? ""}\nDescription: ${meta.description ?? ""}\n\nHTML/MD parcial:\n${snippet}\n\nExtrae: paleta de colores principal (en HSL "H S% L%" sin hsl()), tipografías, nombre de marca, tagline corto, hero headline y subtítulo.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_theme",
            description: "Devuelve el design system extraído",
            parameters: {
              type: "object",
              properties: {
                site_name: { type: "string" },
                tagline: { type: "string" },
                hero_headline: { type: "string" },
                hero_subtitle: { type: "string" },
                color_primary: { type: "string", description: "HSL como 145 100% 45%" },
                color_secondary: { type: "string" },
                color_background: { type: "string" },
                color_foreground: { type: "string" },
                color_accent: { type: "string" },
                font_heading: { type: "string", description: "Familia Google Font ej: Space Grotesk" },
                font_body: { type: "string" },
                style_notes: { type: "string", description: "1-2 líneas describiendo el estilo (minimalista, corporate, etc.)" },
              },
              required: ["site_name","color_primary","color_secondary","color_background","color_foreground","color_accent","font_heading","font_body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_theme" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos agotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("ai err", aiResp.status, t);
      throw new Error("AI gateway error");
    }
    const aiJson = await aiResp.json();
    const tool = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tool) throw new Error("AI no devolvió tema");
    const theme = JSON.parse(tool.function.arguments);

    // 3. Try to extract logo/favicon/og + gallery from html
    const logoMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const absolutize = (u?: string) => {
      if (!u) return null;
      try { return new URL(u, url).toString(); } catch { return u; }
    };

    // Extract top images from <img src> tags (skip 1x1 trackers + svgs already used)
    const imgUrls = new Set<string>();
    const imgRe = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp|avif))(?:\?[^"']*)?["']/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(html)) && imgUrls.size < 10) {
      const abs = absolutize(m[1]);
      if (abs) imgUrls.add(abs);
    }
    const gallery_urls = Array.from(imgUrls).slice(0, 6);

    return new Response(JSON.stringify({
      ...theme,
      favicon_url: absolutize(logoMatch?.[1]) ?? null,
      og_image_url: absolutize(ogMatch?.[1]) ?? null,
      gallery_urls,
      source_html_excerpt: snippet.slice(0, 10000),
      source_url: url,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("import-theme err", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

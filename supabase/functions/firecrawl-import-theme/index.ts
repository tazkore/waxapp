import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) throw new Error("Missing API keys");

    // 1. Scrape page (markdown + html)
    const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: false }),
    });
    if (!fcResp.ok) {
      const t = await fcResp.text();
      console.error("firecrawl err", fcResp.status, t);
      return new Response(JSON.stringify({ error: "Scraping falló" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fcJson = await fcResp.json();
    const html: string = fcJson?.data?.html ?? "";
    const md: string = fcJson?.data?.markdown ?? "";
    const meta = fcJson?.data?.metadata ?? {};

    // Snapshot HTML to extract obvious assets
    const snippet = (html || md).slice(0, 30000);

    // 2. Ask AI to extract a theme spec (HSL palette, fonts, tagline, hero copy)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    // 3. Try to extract logo/favicon from html
    const logoMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const absolutize = (u?: string) => {
      if (!u) return null;
      try { return new URL(u, url).toString(); } catch { return u; }
    };

    return new Response(JSON.stringify({
      ...theme,
      favicon_url: absolutize(logoMatch?.[1]) ?? null,
      og_image_url: absolutize(ogMatch?.[1]) ?? null,
      source_url: url,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("import-theme err", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

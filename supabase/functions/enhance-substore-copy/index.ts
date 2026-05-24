import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const ok = (roles ?? []).some((r: any) => r.role === "super_admin" || r.role === "admin");
    if (!ok) return json({ error: "Forbidden" }, 403);

    const { snapshot, source_html_excerpt, brand_name } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "AI no configurada" }, 500);

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres copywriter senior estilo Tesla/Apple en español MX. Tono Dark Mode Tech: minimalista, técnico, premium. No inventes productos ni precios. Mantén nombre de marca." },
          { role: "user", content: `Marca: ${brand_name ?? snapshot?.name ?? ""}\nCopy actual:\n${JSON.stringify(snapshot ?? {}, null, 2)}\n\nFragmento HTML/MD del sitio original:\n${(source_html_excerpt ?? "").slice(0, 12000)}\n\nMejora la copia para una sub-tienda independiente.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "improve_copy",
            description: "Devuelve la copia mejorada",
            parameters: {
              type: "object",
              properties: {
                tagline: { type: "string" },
                description: { type: "string" },
                hero_headline: { type: "string" },
                hero_subtitle: { type: "string" },
                seo_meta_title: { type: "string" },
                seo_meta_description: { type: "string" },
                cta_primary: { type: "string" },
                cta_secondary: { type: "string" },
              },
              required: ["tagline", "hero_headline", "hero_subtitle"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "improve_copy" } },
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit" }, 429);
      if (aiResp.status === 402) return json({ error: "Sin créditos" }, 402);
      return json({ error: "AI error" }, 500);
    }
    const aij = await aiResp.json();
    const tool = aij?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tool) return json({ error: "Sin respuesta IA" }, 500);
    return json(JSON.parse(tool.function.arguments));
  } catch (e) {
    console.error("enhance-substore err", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

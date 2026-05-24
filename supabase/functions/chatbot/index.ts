import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ok = (reply: string) =>
    new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return ok("Hola, escríbeme algo para ayudarte.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Read API key: env var first, then site_settings
    let GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "google_ai_api_key")
        .maybeSingle();
      if (setting?.value) {
        GOOGLE_AI_API_KEY = typeof setting.value === "string" ? setting.value : String(setting.value);
      }
    }

    if (!GOOGLE_AI_API_KEY) {
      return ok("Lo siento, el chatbot no está configurado aún. Escríbenos a info@waxapp.mx");
    }

    const [{ data: kb }, { data: products }] = await Promise.all([
      supabase.from("chatbot_kb").select("title,category,content").eq("is_active", true).limit(50),
      supabase.from("products").select("name,slug,description,price,category,stock,image_url").eq("is_active", true).limit(40),
    ]);

    const kbContext = (kb ?? []).map((k) => `[${k.category}] ${k.title}: ${k.content}`).join("\n\n");
    const productCatalog = (products ?? []).map((p) =>
      `- ${p.name} | slug:${p.slug ?? 'n/a'} | ${p.category ?? 'general'} | $${p.price} MXN | stock:${p.stock} | ${p.description ?? ''}`
    ).join("\n");

    const systemPrompt = `Eres "Waxa", el agente de ventas IA de WAXAPP, una tienda mexicana de productos premium de bienestar bio-tech.

PERSONALIDAD: Profesional, cálido, consultivo. Español de México. Sin emojis excesivos.

OBJETIVO: Recomendar productos según necesidades, resolver dudas y cerrar ventas. Menciona el 15% de bienvenida al registrarse cuando sea natural.

REGLAS CRÍTICAS:
- Solo recomienda productos del CATÁLOGO de abajo.
- Cuando recomiendes un producto, INCLUYE SU LINK en formato markdown: [Nombre del producto](/producto/SLUG) usando el slug exacto del catálogo.
- Si no tienes la info, sé honesto y sugiere info@waxapp.mx.
- Productos legales (<0.3% THC), solo +18. No des consejos médicos.
- 2-4 oraciones por respuesta salvo que pidan detalle.
- Formato markdown permitido: **negritas**, listas, links.

BASE DE CONOCIMIENTO:
${kbContext}

CATÁLOGO ACTUAL (usa los slugs para links):
${productCatalog}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      }
    );

    if (response.status === 429) {
      return ok("Estoy recibiendo muchas consultas en este momento. Intenta de nuevo en unos segundos o escríbenos a info@waxapp.mx.");
    }

    if (!response.ok) {
      console.error("Google AI error:", response.status, await response.text());
      return ok("Tuve un problema técnico. Puedes escribirnos directamente a info@waxapp.mx.");
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Lo siento, no pude generar una respuesta. Escríbenos a info@waxapp.mx.";
    return ok(reply);
  } catch (e) {
    console.error("chatbot error:", e);
    return ok("Ocurrió un error. Por favor escríbenos a info@waxapp.mx.");
  }
});

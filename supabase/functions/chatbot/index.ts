import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Load knowledge base + featured products
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta en un momento." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Servicio temporalmente no disponible." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Lo siento, no pude generar una respuesta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

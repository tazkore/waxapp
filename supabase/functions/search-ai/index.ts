// Lovable AI-powered global site search
// Searches products, blog posts and SEO pages, then asks the AI to craft a helpful answer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json().catch(() => ({ query: "" }));
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [], answer: "" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const q = query.trim();
    const like = `%${q}%`;

    // Parallel content lookup
    const [productsRes, postsRes, pagesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, description, price, category, image_url")
        .eq("is_active", true)
        .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
        .limit(8),
      supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, category")
        .eq("status", "published")
        .or(`title.ilike.${like},excerpt.ilike.${like},content.ilike.${like}`)
        .limit(5),
      supabase
        .from("seo_pages")
        .select("id, page_path, page_title, meta_description")
        .or(`page_title.ilike.${like},meta_description.ilike.${like},page_path.ilike.${like}`)
        .limit(5),
    ]);

    const products = (productsRes.data ?? []).map((p) => ({
      type: "product" as const,
      id: p.id,
      title: p.name,
      url: `/producto/${p.slug ?? p.id}`,
      snippet: p.description?.slice(0, 160) ?? "",
      price: p.price,
      image: p.image_url,
      category: p.category,
    }));
    const posts = (postsRes.data ?? []).map((b) => ({
      type: "blog" as const,
      id: b.id,
      title: b.title,
      url: `/blog/${b.slug}`,
      snippet: b.excerpt ?? "",
      category: b.category,
    }));
    const pages = (pagesRes.data ?? []).map((s) => ({
      type: "page" as const,
      id: s.id,
      title: s.page_title,
      url: s.page_path,
      snippet: s.meta_description ?? "",
    }));

    const results = [...products, ...posts, ...pages];

    // Build compact context for the AI
    const context = results
      .map(
        (r, i) =>
          `[${i + 1}] (${r.type}) ${r.title} — ${r.url}${
            "price" in r && r.price ? ` — $${r.price} MXN` : ""
          }\n${r.snippet}`,
      )
      .join("\n\n");

    const systemPrompt = `Eres el asistente de búsqueda de WAXAPP, una tienda mexicana de productos bio-tech (CBD, edibles, vapes y cosmética avanzada).
Responde SIEMPRE en español, en máximo 4 oraciones, tono cercano y profesional.
Recomienda 1-3 resultados relevantes citándolos como [1], [2]... usando los números del contexto.
Si no hay resultados relevantes, sugiere amablemente categorías afines o decir "no encontré coincidencias exactas".
Nunca inventes productos que no estén en el contexto.`;

    const userPrompt = `Pregunta del usuario: "${q}"\n\nResultados disponibles:\n${
      context || "(sin resultados en la base)"
    }`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ results, answer: null, error: "Demasiadas solicitudes, intenta en un momento." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ results, answer: null, error: "Sin créditos de IA disponibles." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ results, answer: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const answer: string = aiData.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ results, answer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-ai error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

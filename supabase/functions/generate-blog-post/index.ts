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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verify role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const rolesList = (roles ?? []).map((r: any) => r.role);
    if (!rolesList.includes("admin") && !rolesList.includes("moderator") && !rolesList.includes("super_admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { topic, category = "general", tone = "profesional, claro, estilo Apple/Tesla", generateImage = false } = body;
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Generate article via tool calling
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `Eres un redactor SEO senior para WAXAPP, e-commerce premium de cannabis, CBD y nano tecnología en México. Escribes en español neutro, tono ${tone}. Cumples leyes mexicanas de comunicación de cannabis (sin claims médicos infundados, advertencia +18). Usas markdown con H2/H3, párrafos cortos, listas y un CTA suave al final.`,
          },
          {
            role: "user",
            content: `Genera un artículo de blog SEO-optimizado de 800-1200 palabras sobre: "${topic}". Categoría: ${category}. Devuelve título atractivo (<60 chars), slug url-friendly, excerpt (<155 chars), contenido en markdown, meta_title (<60), meta_description (<155), 5-8 keywords y la categoría.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_blog_post",
            description: "Genera un artículo de blog optimizado para SEO",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                slug: { type: "string", description: "url-friendly, kebab-case, sin acentos" },
                excerpt: { type: "string" },
                content: { type: "string", description: "Markdown completo del artículo" },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                category: { type: "string", enum: ["cbd", "thc", "edibles", "nano", "general", "guias"] },
              },
              required: ["title", "slug", "excerpt", "content", "meta_title", "meta_description", "keywords", "category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_blog_post" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Intenta más tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "AI no devolvió artículo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const post = JSON.parse(toolCall.function.arguments);

    // 2. Optional cover image
    let cover_image_url: string | null = null;
    if (generateImage) {
      try {
        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{
              role: "user",
              content: `Imagen de portada minimalista, dark mode tech (Tesla/Apple), tonos verde neón #00E676 y negro profundo, sin texto, para artículo: ${post.title}`,
            }],
            modalities: ["image", "text"],
          }),
        });
        if (imgResp.ok) {
          const imgJson = await imgResp.json();
          const dataUrl: string | undefined = imgJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (dataUrl?.startsWith("data:image/")) {
            const [meta, b64] = dataUrl.split(",");
            const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
            const ext = mime.includes("png") ? "png" : "jpg";
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const path = `blog/${Date.now()}-${post.slug}.${ext}`;

            const adminClient = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            );
            const { error: upErr } = await adminClient.storage.from("media").upload(path, bytes, {
              contentType: mime, upsert: true,
            });
            if (!upErr) {
              const { data: pub } = adminClient.storage.from("media").getPublicUrl(path);
              cover_image_url = pub.publicUrl;
            } else {
              console.error("upload err", upErr);
            }
          }
        }
      } catch (e) {
        console.error("image gen failed", e);
      }
    }

    return new Response(JSON.stringify({ ...post, cover_image_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

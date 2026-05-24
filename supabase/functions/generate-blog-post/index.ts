import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verify role/permission: super_admin always passes, otherwise admin/moderator OR has blog.generate_ai permission
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const rolesList = (roles ?? []).map((r: any) => r.role);
    const isSuperAdmin = rolesList.includes("super_admin");
    let allowed = isSuperAdmin || rolesList.includes("admin") || rolesList.includes("moderator");
    if (!allowed) {
      const { data: perm } = await supabase.from("user_permissions").select("permission_key").eq("user_id", userId).eq("permission_key", "blog.generate_ai").maybeSingle();
      allowed = !!perm;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "No tienes permiso para generar contenido con IA. Pide al super admin que te asigne 'blog.generate_ai'." }), {
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // 1. Generate article via tool calling
    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
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
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings." }), {
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
        const imgResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `Imagen de portada minimalista, dark mode tech (Tesla/Apple), tonos verde neón #00E676 y negro profundo, sin texto, para artículo: ${post.title}`,
            numberOfImages: 1,
            outputMimeType: "image/png",
            aspectRatio: "16:9",
          }),
        });
        if (imgResp.ok) {
          const imgJson = await imgResp.json();
          const imageBytes = imgJson?.generatedImages?.[0]?.image?.imageBytes;
          if (imageBytes) {
            const mime = "image/png";
            const ext = "png";
            const bytes = Uint8Array.from(atob(imageBytes), (c) => c.charCodeAt(0));
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

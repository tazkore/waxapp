// product-autofill: usa Lovable AI para sugerir todos los campos faltantes de un producto.
// Recibe el producto parcial y devuelve un objeto con propuestas (no escribe en DB).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const TOOL = {
  type: "function",
  function: {
    name: "fill_product",
    description: "Generate complete e-commerce product metadata in Spanish (Mexico)",
    parameters: {
      type: "object",
      properties: {
        short_description: { type: "string" },
        description: { type: "string" },
        long_description_html: { type: "string", description: "HTML simple con <p>, <ul>, <li>, <strong>" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        meta_title: { type: "string", description: "Máx 60 caracteres" },
        meta_description: { type: "string", description: "Máx 160 caracteres" },
        focus_keyword: { type: "string" },
        meta_keywords: { type: "array", items: { type: "string" } },
        attributes: {
          type: "object",
          description: "Atributos estructurados del producto",
          properties: {
            flavors: { type: "array", items: { type: "string" } },
            ingredients: { type: "array", items: { type: "string" } },
            allergens: { type: "array", items: { type: "string" } },
            vaporizer_type: {
              type: "string",
              enum: ["cartridge", "disposable", "pod", "dry_herb", "battery", "n_a"],
            },
            concentration: { type: "string" },
            thc_content: { type: "string" },
            cbd_content: { type: "string" },
            volume_ml: { type: "number" },
            puffs: { type: "number" },
            battery_mah: { type: "number" },
            warnings: { type: "string" },
            country_origin: { type: "string" },
            lab_tested: { type: "boolean" },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
    const ok = roles?.some((r: any) => ["admin", "super_admin", "moderator"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Permisos insuficientes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const product = body?.product ?? {};
    const onlyMissing = body?.only_missing !== false; // default true

    const ctx = JSON.stringify(
      {
        name: product.name,
        existing_description: product.description,
        existing_short: product.short_description,
        category: product.category,
        brand: product.brand_name,
        price: product.price,
        sku: product.sku,
        gtin: product.gtin,
        url: product.canonical_url || product.source_url,
      },
      null,
      2,
    );

    const sys = `Eres un experto en ecommerce de productos cannábicos/CBD/vapeo en México.
Escribe en español neutro mexicano. Cumple normativas (advertencias, +18).
Si el producto NO es un vaporizador, usa vaporizer_type="n_a".
Si no estás seguro de un atributo, omítelo (no inventes).`;

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `PRODUCTO PARCIAL:\n${ctx}\n\nDevuelve la propuesta vía la herramienta fill_product.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "fill_product" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Límite de IA alcanzado, intenta más tarde." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Sin créditos de IA disponibles." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      console.error("AI error", aiRes.status, JSON.stringify(aiData).slice(0, 300));
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const proposal = typeof args === "string" ? JSON.parse(args) : args || {};

    if (onlyMissing) {
      // Filtra propuestas para que no sobreescriba campos ya con valor
      for (const k of Object.keys(proposal)) {
        if (k === "attributes") continue;
        const cur = (product as any)[k];
        if (cur != null && cur !== "" && !(Array.isArray(cur) && cur.length === 0)) {
          delete (proposal as any)[k];
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, proposal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-autofill error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, purchase_total } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0 || code.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid discount code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof purchase_total !== "number" || purchase_total < 0) {
      return new Response(JSON.stringify({ error: "Invalid purchase_total" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: discount, error } = await supabase
      .from("discounts")
      .select("id, code, type, value, min_purchase, max_uses, used_count, expires_at, is_active")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !discount) {
      return new Response(JSON.stringify({ valid: false, error: "Código de descuento no válido" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Código expirado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: "Código agotado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check min purchase
    if (discount.min_purchase && purchase_total < discount.min_purchase) {
      return new Response(JSON.stringify({
        valid: false,
        error: `Compra mínima de $${discount.min_purchase} requerida`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate discount amount (don't expose code or internal details)
    let discount_amount = 0;
    if (discount.type === "percentage") {
      discount_amount = Math.round(purchase_total * (discount.value / 100) * 100) / 100;
    } else {
      discount_amount = Math.min(discount.value, purchase_total);
    }

    return new Response(JSON.stringify({
      valid: true,
      type: discount.type,
      value: discount.value,
      discount_amount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("validate-discount error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

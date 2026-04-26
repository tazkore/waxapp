import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns the most recent unused WELCOME coupon for the requesting user.
// The coupon was created automatically by the on-customer-profile trigger.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Get the most recent active WELCOME coupon (created by trigger when customer_profile was inserted)
    const { data: coupon } = await admin
      .from("discounts")
      .select("code, value, expires_at")
      .like("code", "WELCOME%")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!coupon) {
      return new Response(JSON.stringify({ error: "No coupon available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend connector gateway
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let emailSent = false;
    if (resendKey && lovableKey && user.email) {
      try {
        const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "WAXAPP <noreply@updates.grupoko.com>",
            to: [user.email],
            subject: `🎁 Tu cupón de bienvenida: ${coupon.value}% de descuento`,
            html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;color:#111;">
              <h1 style="margin:0 0 8px;">¡Bienvenido a WAXAPP!</h1>
              <p style="color:#555;">Gracias por unirte. Aquí está tu cupón de bienvenida:</p>
              <div style="background:#f5f5f5;border:2px dashed #888;padding:24px;text-align:center;border-radius:12px;margin:24px 0;">
                <div style="font-size:12px;color:#888;letter-spacing:2px;">CÓDIGO</div>
                <div style="font-size:32px;font-weight:bold;letter-spacing:4px;margin-top:8px;">${coupon.code}</div>
                <div style="margin-top:12px;font-size:14px;color:#555;">${coupon.value}% de descuento • Válido hasta ${new Date(coupon.expires_at).toLocaleDateString('es-MX')}</div>
              </div>
              <p style="font-size:13px;color:#888;">Aplícalo al pagar. Compra mínima $300 MXN.</p>
            </div>`,
          }),
        });
        emailSent = r.ok;
        if (!r.ok) console.error("Resend error:", await r.text());
      } catch (e) {
        console.error("Email send failed:", e);
      }
    }

    return new Response(JSON.stringify({
      code: coupon.code,
      value: coupon.value,
      expires_at: coupon.expires_at,
      emailSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("welcome-coupon error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "WAXAPP <noreply@updates.grupoko.com>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      proof_id,
      status, // 'approved' | 'rejected'
      reason,
      customer_email,
      customer_name,
      amount,
      reference,
    } = body ?? {};

    if (!proof_id || !customer_email || !["approved", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ error: "Missing/invalid fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!isAdmin && !isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fmt = (n: number) =>
      n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    const isApproved = status === "approved";
    const title = isApproved
      ? "✅ Tu comprobante fue verificado"
      : "❌ Tu comprobante fue rechazado";
    const intro = isApproved
      ? "Confirmamos la recepción de tu pago. Tu pedido continúa su proceso."
      : "Revisamos tu comprobante y no pudimos validarlo.";
    const refLine = reference ? `<p><strong>Referencia:</strong> ${reference}</p>` : "";
    const amountLine = amount ? `<p><strong>Monto:</strong> ${fmt(Number(amount))}</p>` : "";
    const reasonBlock = !isApproved && reason
      ? `<div style="background:#fee;border-left:4px solid #c00;padding:12px 16px;border-radius:6px;margin:16px 0;">
           <strong>Motivo:</strong><br>${String(reason).replace(/</g, "&lt;")}
         </div>`
      : "";

    const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;color:#111;">
      <h1 style="margin:0 0 12px;">${title}</h1>
      <p style="color:#555;">Hola${customer_name ? ` ${customer_name}` : ""}, ${intro}</p>
      ${amountLine}
      ${refLine}
      ${reasonBlock}
      <p style="font-size:13px;color:#888;margin-top:24px;">Si tienes dudas, contesta este correo y te ayudamos.</p>
      <p style="font-size:12px;color:#aaa;margin-top:12px;">— Equipo WAXAPP</p>
    </div>`;

    // 1. Inbox interno
    await admin.from("client_notifications").insert({
      email: customer_email,
      type: isApproved ? "payment_proof_approved" : "payment_proof_rejected",
      title,
      body: isApproved ? intro : `${intro}${reason ? ` Motivo: ${reason}` : ""}`,
      metadata: { proof_id, reference, amount, reason: reason ?? null },
    });

    // 2. Email vía Resend (dominio updates.grupoko.com)
    let emailSent = false;
    let emailError: string | null = null;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (resendKey && lovableKey) {
      try {
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: [customer_email],
            subject: title,
            html,
          }),
        });
        emailSent = r.ok;
        if (!r.ok) emailError = await r.text();
      } catch (e) {
        emailError = e instanceof Error ? e.message : "unknown";
      }
    } else {
      emailError = "RESEND_API_KEY o LOVABLE_API_KEY no configurados";
    }

    return new Response(JSON.stringify({ success: true, emailSent, emailError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-payment-proof error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

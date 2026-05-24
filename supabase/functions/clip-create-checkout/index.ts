import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

async function getClipCredentials(supabase: any) {
  let publicKey = Deno.env.get("CLIP_PUBLIC_KEY");
  let secretKey = Deno.env.get("CLIP_SECRET_KEY") || Deno.env.get("CLIP_API_KEY");

  if (!publicKey || !secretKey) {
    const { data: rows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["clip_public_key", "clip_secret_key"]);

    (rows ?? []).forEach((r: any) => {
      const v = typeof r.value === "string" ? r.value : String(r.value);
      if (r.key === "clip_public_key") publicKey = v;
      if (r.key === "clip_secret_key") secretKey = v;
    });
  }

  return { publicKey, secretKey };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { publicKey, secretKey } = await getClipCredentials(supabase);

    if (!publicKey || !secretKey) {
      console.error("Clip credentials not configured");
      return new Response(JSON.stringify({ error: "Pasarela de pago no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { card_token, order_id, amount, currency, customer_email, customer_name, customer_phone, description } = body;

    if (!card_token || typeof card_token !== "string") {
      return new Response(JSON.stringify({ error: "card_token requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Monto inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic auth: base64(public_key:secret_key)
    const basicAuth = btoa(`${publicKey}:${secretKey}`);

    const clipResponse = await fetch("https://api.payclip.com/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: currency || "MXN",
        description: description || "Pedido WAXAPP",
        payment_method: { token: card_token },
        customer: {
          email: customer_email || "",
          first_name: customer_name?.split(" ")[0] || "",
          last_name: customer_name?.split(" ").slice(1).join(" ") || "",
          phone: customer_phone || "",
        },
      }),
    });

    const clipData = await clipResponse.json();

    if (!clipResponse.ok) {
      console.error("Clip payment error:", JSON.stringify(clipData));
      const errorMsg = clipData?.message || clipData?.detail || "Pago fallido";
      return new Response(JSON.stringify({ error: errorMsg, clip_error: clipData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment successful — update order
    await supabase.from("orders").update({ status: "paid" }).eq("id", order_id);
    await supabase.from("order_status_history").insert({
      order_id,
      previous_status: "pending",
      new_status: "paid",
      changed_by: "sistema (Clip)",
      notes: `Pago procesado vía Clip. ID: ${clipData.id || clipData.receipt_no || "N/A"}`,
    });

    return new Response(JSON.stringify({
      success: true,
      payment_id: clipData.id || clipData.receipt_no,
      status: clipData.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("process-clip-payment error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

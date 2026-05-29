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
      // value may be stored as JSON string with surrounding quotes
      const v = typeof r.value === "string"
        ? r.value.replace(/^"|"$/g, "")
        : String(r.value).replace(/^"|"$/g, "");
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
      return new Response(JSON.stringify({ error: "Pasarela de pago no configurada. Contacta al administrador." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      order_id,
      amount,
      currency,
      reference_number,
      description,
      success_url,
      cancel_url,
    } = body;

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

    // Clip Checkout API uses Basic auth: base64(api_key:api_secret)
    const basicAuth = btoa(`${publicKey}:${secretKey}`);

    // POST to Clip Checkout hosted page API
    const clipPayload: Record<string, unknown> = {
      amount: +amount.toFixed(2),
      currency: currency || "MXN",
      purchase_description: description || `Pedido WAXAPP ${reference_number || order_id}`,
      redirection_url: {
        success: success_url || "",
        error: cancel_url || "",
        cancel: cancel_url || "",
      },
      // Clip uses reference to link payment to order
      reference: reference_number || order_id,
    };

    console.log("Calling Clip v2/checkout:", JSON.stringify({ amount: clipPayload.amount, reference: clipPayload.reference }));

    const clipResponse = await fetch("https://api.payclip.com/v2/checkout", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(clipPayload),
    });

    const clipData = await clipResponse.json();
    console.log("Clip response status:", clipResponse.status, "body:", JSON.stringify(clipData));

    if (!clipResponse.ok) {
      const errorMsg = clipData?.message || clipData?.error || clipData?.detail || "Error al crear sesión de pago";
      console.error("Clip checkout error:", JSON.stringify(clipData));
      return new Response(JSON.stringify({ error: errorMsg, clip_error: clipData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clip returns payment_request_id and a checkout URL
    // Response shape: { payment_request_id, redirect_url or checkout_url }
    const checkoutUrl = clipData.redirect_url || clipData.checkout_url || clipData.url
      || (clipData.payment_request_id
        ? `https://checkout.clip.mx/${clipData.payment_request_id}`
        : null);

    if (!checkoutUrl) {
      console.error("Clip did not return a checkout URL:", JSON.stringify(clipData));
      return new Response(JSON.stringify({
        error: "Clip no devolvió una URL de pago. Intenta de nuevo.",
        clip_response: clipData,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store payment_request_id in voucher_metadata for webhook reconciliation (don't overwrite extras)
    if (clipData.payment_request_id) {
      await supabase
        .from("orders")
        .update({ voucher_metadata: { clip_payment_request_id: clipData.payment_request_id } })
        .eq("id", order_id);
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: checkoutUrl,
      payment_request_id: clipData.payment_request_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("clip-create-checkout error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CLIP_API_KEY = Deno.env.get("CLIP_API_KEY");
    if (!CLIP_API_KEY) {
      console.error("CLIP_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { card_token, order_id, amount, currency, customer_email, customer_name, customer_phone, description } = body;

    // Validate required fields
    if (!card_token || typeof card_token !== "string") {
      return new Response(JSON.stringify({ error: "card_token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Clip Payments API
    const clipResponse = await fetch("https://api.payclip.com/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${CLIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: currency || "MXN",
        description: description || `Pedido WAXAPP`,
        payment_method: {
          token: card_token,
        },
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
      const errorMsg = clipData?.message || clipData?.detail || "Payment failed";
      return new Response(JSON.stringify({ error: errorMsg, clip_error: clipData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment successful — update order status
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase.from("orders").update({
      status: "paid",
    }).eq("id", order_id);

    // Record status change
    await supabase.from("order_status_history").insert({
      order_id,
      previous_status: "pending",
      new_status: "paid",
      changed_by: "sistema (Clip)",
      notes: `Pago procesado via Clip. ID: ${clipData.id || clipData.receipt_no || "N/A"}`,
    });

    return new Response(JSON.stringify({
      success: true,
      payment_id: clipData.id || clipData.receipt_no,
      status: clipData.status,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-clip-payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

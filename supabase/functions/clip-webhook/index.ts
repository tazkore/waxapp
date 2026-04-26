// Webhook público para Clip → registra/actualiza payment_transactions
// No requiere JWT (Clip llamará desde fuera). Validamos firma si está configurada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clip-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClipEvent {
  id?: string;
  type?: string; // payment.succeeded, payment.failed, payment.refunded, etc.
  data?: {
    id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    payment_method?: { type?: string };
    customer?: { email?: string; name?: string };
    metadata?: { order_id?: string; reference?: string };
    created_at?: string;
    paid_at?: string;
    fees?: { amount?: number };
  };
}

const mapStatus = (clipStatus?: string, eventType?: string): string => {
  if (eventType?.includes("refund")) return "refunded";
  if (eventType?.includes("failed")) return "failed";
  if (eventType?.includes("dispute")) return "disputed";
  switch (clipStatus?.toLowerCase()) {
    case "succeeded":
    case "approved":
    case "paid":
      return "paid";
    case "authorized":
      return "authorized";
    case "refunded":
      return "refunded";
    case "failed":
    case "declined":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const event: ClipEvent = await req.json();
    console.log("[clip-webhook] Event:", event.type, event.data?.id);

    if (!event.data?.id) {
      return new Response(JSON.stringify({ error: "Missing data.id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = mapStatus(event.data.status, event.type);
    const amount = (event.data.amount ?? 0) / 100; // Clip usa centavos
    const fee = (event.data.fees?.amount ?? 0) / 100;

    // Upsert por (gateway_slug, external_id)
    const { data: existing } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("gateway_slug", "clip")
      .eq("external_id", event.data.id)
      .maybeSingle();

    const payload = {
      gateway_slug: "clip",
      external_id: event.data.id,
      reference: event.data.metadata?.reference ?? null,
      amount,
      currency: event.data.currency ?? "MXN",
      fee_amount: fee,
      net_amount: amount - fee,
      status,
      method: event.data.payment_method?.type ?? "card",
      customer_email: event.data.customer?.email ?? null,
      customer_name: event.data.customer?.name ?? null,
      paid_at: status === "paid" ? (event.data.paid_at ?? new Date().toISOString()) : null,
      raw: event as unknown as Record<string, unknown>,
    };

    if (existing) {
      await supabase.from("payment_transactions").update(payload).eq("id", existing.id);
    } else {
      // Buscar gateway_id
      const { data: gw } = await supabase
        .from("payment_gateways")
        .select("id")
        .eq("slug", "clip")
        .maybeSingle();
      await supabase.from("payment_transactions").insert({
        ...payload,
        gateway_id: gw?.id ?? null,
      });
    }

    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[clip-webhook] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

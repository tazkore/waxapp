// Webhook público para Clip → registra/actualiza payment_transactions
// y sincroniza el estado del pedido vinculado (orders.status).
// No requiere JWT (Clip llama desde fuera).
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
    metadata?: { order_id?: string; order_number?: string; reference?: string };
    created_at?: string;
    paid_at?: string;
    fees?: { amount?: number };
  };
}

// Mapea estado de Clip → estado de payment_transactions
const mapTxStatus = (clipStatus?: string, eventType?: string): string => {
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

// Mapea estado de transacción → estado del pedido
const mapOrderStatus = (txStatus: string, currentOrderStatus?: string): string | null => {
  // No degradar pedidos ya despachados
  const protectedStates = new Set(["shipped", "in_transit", "delivered", "completed"]);
  if (currentOrderStatus && protectedStates.has(currentOrderStatus)) return null;

  switch (txStatus) {
    case "paid":
      return "paid";
    case "authorized":
      return "pending"; // Aún no liquidado
    case "pending":
      return "pending";
    case "refunded":
      return "refunded";
    case "failed":
    case "cancelled":
      return "cancelled";
    case "disputed":
      return "disputed";
    default:
      return null;
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

    const txStatus = mapTxStatus(event.data.status, event.type);
    const amount = (event.data.amount ?? 0) / 100; // Clip usa centavos
    const fee = (event.data.fees?.amount ?? 0) / 100;
    const reference = event.data.metadata?.reference ?? null;
    const orderHint =
      event.data.metadata?.order_id ?? event.data.metadata?.order_number ?? reference ?? null;

    // ────────────────────────────────────────────────────────────────
    // 1. Resolver order_id (UUID) si llegó algún hint
    // ────────────────────────────────────────────────────────────────
    let orderId: string | null = null;
    let currentOrderStatus: string | null = null;

    if (orderHint) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderHint);
      let q = supabase.from("orders").select("id, status");
      q = isUuid ? q.eq("id", orderHint) : q.eq("order_number", orderHint);
      const { data: order } = await q.maybeSingle();
      if (order) {
        orderId = order.id;
        currentOrderStatus = order.status;
      } else {
        console.log("[clip-webhook] No order found for hint:", orderHint);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 2. Upsert payment_transactions
    // ────────────────────────────────────────────────────────────────
    const { data: existingTx } = await supabase
      .from("payment_transactions")
      .select("id, order_id")
      .eq("gateway_slug", "clip")
      .eq("external_id", event.data.id)
      .maybeSingle();

    const txPayload = {
      gateway_slug: "clip",
      external_id: event.data.id,
      reference,
      order_id: orderId ?? existingTx?.order_id ?? null,
      amount,
      currency: event.data.currency ?? "MXN",
      fee_amount: fee,
      net_amount: amount - fee,
      status: txStatus,
      method: event.data.payment_method?.type ?? "card",
      customer_email: event.data.customer?.email ?? null,
      customer_name: event.data.customer?.name ?? null,
      paid_at: txStatus === "paid" ? (event.data.paid_at ?? new Date().toISOString()) : null,
      raw: event as unknown as Record<string, unknown>,
    };

    if (existingTx) {
      await supabase.from("payment_transactions").update(txPayload).eq("id", existingTx.id);
    } else {
      const { data: gw } = await supabase
        .from("payment_gateways")
        .select("id")
        .eq("slug", "clip")
        .maybeSingle();
      await supabase.from("payment_transactions").insert({
        ...txPayload,
        gateway_id: gw?.id ?? null,
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 3. Sincronizar estado del pedido + historial
    // ────────────────────────────────────────────────────────────────
    let orderUpdated = false;
    if (orderId) {
      const newOrderStatus = mapOrderStatus(txStatus, currentOrderStatus ?? undefined);
      if (newOrderStatus && newOrderStatus !== currentOrderStatus) {
        const { error: updErr } = await supabase
          .from("orders")
          .update({ status: newOrderStatus })
          .eq("id", orderId);

        if (updErr) {
          console.error("[clip-webhook] Order update error:", updErr.message);
        } else {
          orderUpdated = true;
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            previous_status: currentOrderStatus ?? "unknown",
            new_status: newOrderStatus,
            changed_by: "clip-webhook",
            notes: `Clip event ${event.type ?? "unknown"} · tx ${event.data.id}`,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tx_status: txStatus,
        order_id: orderId,
        order_updated: orderUpdated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[clip-webhook] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Job: marca como expiradas las transacciones manuales (OXXO, códigos, transferencia)
// que no fueron verificadas dentro de su ventana `expires_at` y crea una notificación
// para el panel de admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Estados de pedido que NO se deben tocar (ya despachados / entregados)
const PROTECTED_ORDER_STATES = new Set([
  "shipped", "in_transit", "delivered", "completed", "paid",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const nowIso = new Date().toISOString();

    // 1. Buscar transacciones pendientes vencidas
    const { data: expired, error: selErr } = await supabase
      .from("payment_transactions")
      .select("id, external_id, reference, amount, gateway_slug, customer_email, customer_name, order_id, expires_at")
      .eq("status", "pending")
      .not("expires_at", "is", null)
      .lt("expires_at", nowIso)
      .limit(500);

    if (selErr) throw selErr;

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ ok: true, expired: 0, message: "Nothing to expire" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expire-pending-payments] Found ${expired.length} expired transactions`);

    const ids = expired.map((t) => t.id);

    // 2. Marcar transacciones como expiradas (status='cancelled' + nota)
    const { error: updErr } = await supabase
      .from("payment_transactions")
      .update({
        status: "cancelled",
        notes: `Expirado automáticamente — sin verificación dentro de la ventana (${nowIso})`,
      })
      .in("id", ids);

    if (updErr) throw updErr;

    // 3. Cancelar pedidos vinculados (si no están protegidos)
    const orderIds = [...new Set(expired.map((t) => t.order_id).filter(Boolean) as string[])];
    let ordersCancelled = 0;

    for (const orderId of orderIds) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, status, order_number")
        .eq("id", orderId)
        .maybeSingle();

      if (!order || PROTECTED_ORDER_STATES.has(order.status)) continue;

      const prev = order.status;
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (!orderErr) {
        ordersCancelled++;
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          previous_status: prev,
          new_status: "cancelled",
          changed_by: "expire-pending-payments",
          notes: "Cancelado por pago expirado sin verificación",
        });
      }
    }

    // 4. Notificación admin (resumen) + notificaciones por cliente
    const totalAmount = expired.reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const byGateway = expired.reduce<Record<string, number>>((acc, t) => {
      acc[t.gateway_slug] = (acc[t.gateway_slug] ?? 0) + 1;
      return acc;
    }, {});

    await supabase.from("admin_notifications").insert({
      type: "payments_expired",
      severity: "warning",
      title: `${expired.length} pagos expirados sin verificación`,
      body: `Se cancelaron automáticamente ${expired.length} transacciones pendientes (${ordersCancelled} pedidos cancelados). Total: $${totalAmount.toFixed(2)} MXN.`,
      metadata: {
        count: expired.length,
        orders_cancelled: ordersCancelled,
        total_amount: totalAmount,
        by_gateway: byGateway,
        transaction_ids: ids,
        ran_at: nowIso,
      },
    });

    // 5. Notificar a cada cliente (inbox interno)
    const clientNotifications = expired
      .filter((t) => t.customer_email)
      .map((t) => ({
        email: t.customer_email,
        type: "payment_expired",
        title: "Tu pago expiró",
        body: `Tu pago por $${Number(t.amount).toFixed(2)} MXN vía ${t.gateway_slug} expiró sin recibir confirmación. Si ya pagaste, contáctanos para reactivarlo.`,
        metadata: {
          transaction_id: t.id,
          reference: t.reference,
          gateway: t.gateway_slug,
          amount: t.amount,
        },
      }));

    if (clientNotifications.length > 0) {
      await supabase.from("client_notifications").insert(clientNotifications);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        expired: expired.length,
        orders_cancelled: ordersCancelled,
        total_amount: totalAmount,
        by_gateway: byGateway,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[expire-pending-payments] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

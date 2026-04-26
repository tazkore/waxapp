// Crea una transacción de pago manual (transferencia, efectivo, OXXO).
// Público: cualquier visitante puede iniciar una transferencia desde el checkout.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  gateway_slug: string;
  amount: number;
  currency?: string;
  customer_email?: string;
  customer_name?: string;
  order_id?: string;
  reference?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: Body = await req.json();
    if (!body.gateway_slug || typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "gateway_slug y amount > 0 son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que la pasarela está activa y es manual
    const { data: gw, error: gwErr } = await supabase
      .from("payment_gateways")
      .select("id, slug, type, is_active")
      .eq("slug", body.gateway_slug)
      .maybeSingle();

    if (gwErr || !gw || !gw.is_active) {
      return new Response(JSON.stringify({ error: "Pasarela no disponible" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (gw.type !== "manual") {
      return new Response(JSON.stringify({ error: "Esta pasarela no acepta pagos manuales" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = body.reference || `REF-${Date.now().toString(36).toUpperCase()}`;

    const { data: tx, error } = await supabase
      .from("payment_transactions")
      .insert({
        gateway_id: gw.id,
        gateway_slug: gw.slug,
        order_id: body.order_id ?? null,
        amount: body.amount,
        currency: body.currency ?? "MXN",
        status: "pending",
        method: gw.slug === "bank_transfer" ? "transfer" : gw.slug === "cash" ? "cash" : "manual",
        customer_email: body.customer_email ?? null,
        customer_name: body.customer_name ?? null,
        reference,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ transaction: tx }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[register-manual-payment]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Sincroniza pagos desde la API de Clip y reconcilia contra payment_transactions.
// Modo: { mode: "manual" | "cron", since?: ISO, until?: ISO }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLIP_API_BASE = "https://api.payclip.com";

const mapStatus = (clipStatus?: string): string => {
  switch ((clipStatus || "").toLowerCase()) {
    case "succeeded":
    case "approved":
    case "paid":
    case "completed":
      return "paid";
    case "authorized":
      return "authorized";
    case "refunded":
      return "refunded";
    case "failed":
    case "declined":
    case "error":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
};

interface ClipPayment {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: { type?: string };
  customer?: { email?: string; name?: string };
  metadata?: Record<string, unknown>;
  created_at?: string;
  paid_at?: string;
  fees?: { amount?: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("CLIP_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "CLIP_API_KEY no configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { mode?: string; since?: string; until?: string } = {};
    try { body = await req.json(); } catch { /* cron sin body */ }

    const since = body.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = body.until || new Date().toISOString();
    const mode = body.mode || "cron";

    // Buscar gateway Clip
    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("id")
      .eq("slug", "clip")
      .maybeSingle();

    // Llamar API Clip
    const url = `${CLIP_API_BASE}/payments?from=${encodeURIComponent(since)}&to=${encodeURIComponent(until)}&limit=200`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Clip API error:", resp.status, txt);
      return new Response(
        JSON.stringify({ error: `Clip API ${resp.status}`, detail: txt.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await resp.json().catch(() => ({}));
    const payments: ClipPayment[] = Array.isArray(json) ? json : (json.data || json.payments || []);

    let upserts = 0;
    let updated = 0;
    let inserted = 0;
    const discrepancies: Array<Record<string, unknown>> = [];

    for (const p of payments) {
      if (!p.id) continue;
      const status = mapStatus(p.status);
      const amount = Number(p.amount || 0);
      const fee = Number(p.fees?.amount || 0);

      // Buscar transacción existente
      const { data: existing } = await supabase
        .from("payment_transactions")
        .select("id, status, amount")
        .eq("gateway_slug", "clip")
        .eq("external_id", p.id)
        .maybeSingle();

      const payload = {
        gateway_id: gateway?.id ?? null,
        gateway_slug: "clip",
        external_id: p.id,
        amount,
        currency: (p.currency || "MXN").toUpperCase(),
        fee_amount: fee,
        net_amount: amount - fee,
        status,
        method: p.payment_method?.type || null,
        customer_email: p.customer?.email || null,
        customer_name: p.customer?.name || null,
        paid_at: p.paid_at || (status === "paid" ? p.created_at : null),
        raw: p as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Detectar discrepancia
        if (existing.status !== status || Number(existing.amount) !== amount) {
          discrepancies.push({
            transaction_id: existing.id,
            external_id: p.id,
            local_status: existing.status,
            remote_status: status,
            local_amount: existing.amount,
            remote_amount: amount,
          });
        }
        await supabase.from("payment_transactions").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("payment_transactions").insert(payload);
        inserted++;
      }
      upserts++;
    }

    const result = {
      ok: true,
      mode,
      since,
      until,
      total_remote: payments.length,
      upserts,
      inserted,
      updated,
      discrepancies_count: discrepancies.length,
      discrepancies: discrepancies.slice(0, 50),
      synced_at: new Date().toISOString(),
    };

    console.log("clip-sync-payments:", JSON.stringify({ ...result, discrepancies: undefined }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clip-sync-payments fatal:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Sincroniza pagos desde la API de Clip y reconcilia contra payment_transactions.
// Body: { mode?: "manual" | "cron", since?: ISO, until?: ISO, offset?: number, cursor?: string,
//         retry_run_id?: string, parent_run_id?: string }
// Si la API de Clip falla, hace reintentos exponenciales internos (3 intentos).
// Persiste cada corrida en clip_sync_runs con last_offset/last_cursor para poder reanudar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLIP_API_BASE = "https://api.payclip.com";
const PAGE_SIZE = 200;
const MAX_RETRIES = 3;

const mapStatus = (clipStatus?: string): string => {
  switch ((clipStatus || "").toLowerCase()) {
    case "succeeded":
    case "approved":
    case "paid":
    case "completed": return "paid";
    case "authorized": return "authorized";
    case "refunded": return "refunded";
    case "failed":
    case "declined":
    case "error": return "failed";
    case "cancelled":
    case "canceled": return "cancelled";
    default: return "pending";
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchClipPage(apiKey: string, since: string, until: string, offset: number, cursor?: string) {
  const params = new URLSearchParams({
    from: since,
    to: until,
    limit: String(PAGE_SIZE),
  });
  if (cursor) params.set("cursor", cursor);
  else params.set("offset", String(offset));
  const url = `${CLIP_API_BASE}/payments?${params.toString()}`;

  let lastErr: { status: number; detail: string } | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (resp.ok) return { data: await resp.json().catch(() => ({})) };
      const txt = await resp.text();
      lastErr = { status: resp.status, detail: txt.slice(0, 300) };
      // Reintentar solo en 429 / 5xx
      if (resp.status !== 429 && resp.status < 500) break;
    } catch (e) {
      lastErr = { status: 0, detail: (e as Error).message };
    }
    if (attempt < MAX_RETRIES) await sleep(500 * Math.pow(2, attempt - 1));
  }
  throw new Error(`Clip API ${lastErr?.status ?? "?"}: ${lastErr?.detail ?? "unknown"}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let runId: string | null = null;
  let body: {
    mode?: string; since?: string; until?: string;
    offset?: number; cursor?: string;
    retry_run_id?: string; parent_run_id?: string;
  } = {};

  try {
    const apiKey = Deno.env.get("CLIP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "CLIP_API_KEY no configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try { body = await req.json(); } catch { /* cron sin body */ }

    // Si es un retry, levantar la corrida fallida para reanudar
    let priorAttempts = 0;
    let parentRunId: string | null = body.parent_run_id ?? null;
    let resumeOffset = body.offset ?? 0;
    let resumeCursor: string | undefined = body.cursor;
    let since = body.since;
    let until = body.until;

    if (body.retry_run_id) {
      const { data: prior } = await supabase
        .from("clip_sync_runs")
        .select("*")
        .eq("id", body.retry_run_id)
        .maybeSingle();
      if (prior) {
        priorAttempts = prior.attempts ?? 0;
        parentRunId = prior.parent_run_id ?? prior.id;
        resumeOffset = prior.last_offset ?? 0;
        resumeCursor = prior.last_cursor ?? undefined;
        since = since ?? prior.since ?? undefined;
        until = until ?? prior.until ?? undefined;
      }
    }

    since = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    until = until || new Date().toISOString();
    const mode = body.mode || "cron";

    // Crear nueva corrida en estado "running"
    const { data: runRow } = await supabase
      .from("clip_sync_runs")
      .insert({
        mode,
        since,
        until,
        status: "running",
        attempts: priorAttempts + 1,
        last_offset: resumeOffset,
        last_cursor: resumeCursor ?? null,
        parent_run_id: parentRunId,
      })
      .select("id")
      .single();
    runId = runRow?.id ?? null;

    const { data: gateway } = await supabase
      .from("payment_gateways").select("id").eq("slug", "clip").maybeSingle();

    let upserts = 0, updated = 0, inserted = 0;
    const discrepancies: Array<Record<string, unknown>> = [];
    let offset = resumeOffset;
    let cursor: string | undefined = resumeCursor;
    let total_remote = 0;
    let pages = 0;
    const MAX_PAGES = 10; // tope por invocación

    while (pages < MAX_PAGES) {
      const { data: json } = await fetchClipPage(apiKey, since, until, offset, cursor);
      const payments: ClipPayment[] = Array.isArray(json)
        ? json
        : ((json as Record<string, unknown>).data as ClipPayment[]) ||
          ((json as Record<string, unknown>).payments as ClipPayment[]) || [];
      const nextCursor = (json as Record<string, unknown>)?.next_cursor as string | undefined;

      for (const p of payments) {
        if (!p.id) continue;
        const status = mapStatus(p.status);
        const amount = Number(p.amount || 0);
        const fee = Number(p.fees?.amount || 0);

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

      total_remote += payments.length;
      pages++;

      // Avanzar cursor / offset
      if (nextCursor) {
        cursor = nextCursor;
      } else {
        offset += payments.length;
      }

      if (payments.length < PAGE_SIZE) break; // última página
    }

    const status = pages >= MAX_PAGES ? "partial" : "success";

    if (runId) {
      await supabase.from("clip_sync_runs").update({
        status,
        total_remote,
        upserts,
        inserted,
        updated,
        discrepancies_count: discrepancies.length,
        last_offset: offset,
        last_cursor: cursor ?? null,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      mode, since, until,
      status,
      total_remote, upserts, inserted, updated,
      discrepancies_count: discrepancies.length,
      discrepancies: discrepancies.slice(0, 50),
      last_offset: offset,
      last_cursor: cursor ?? null,
      synced_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const msg = (e as Error).message ?? "unknown";
    console.error("clip-sync-payments fatal:", msg);
    if (runId) {
      await supabase.from("clip_sync_runs").update({
        status: "failed",
        error_message: msg,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return new Response(JSON.stringify({ ok: false, run_id: runId, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

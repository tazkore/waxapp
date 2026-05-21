// Motor de envío de campañas masivas vía Kapso.ai API REST.
// Requiere JWT (lo llama el frontend autenticado del admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendRequest {
  phones: string[];
  message: string;
}

interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

async function sendKapsoMessage(
  phone: string,
  message: string,
  apiKey: string,
  phoneNumberId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // API de Kapso para envío de mensajes de texto libre
    // Endpoint documentado: POST https://api.kapso.ai/v1/messages
    const res = await fetch("https://api.kapso.ai/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number_id: phoneNumberId,
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      return { ok: false, error: `${phone}: HTTP ${res.status} — ${errBody}` };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: `${phone}: ${msg}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("KAPSO_API_KEY");
    const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID");

    if (!apiKey || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "KAPSO_API_KEY o KAPSO_PHONE_NUMBER_ID no configurados." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phones, message }: SendRequest = await req.json();

    if (!phones?.length || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Se requieren phones[] y message." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: SendResult = { sent: 0, failed: 0, errors: [] };

    // Envío secuencial con pequeño delay para respetar rate limits del plan gratuito
    for (const phone of phones) {
      const { ok, error } = await sendKapsoMessage(phone, message, apiKey, phoneNumberId);
      if (ok) {
        result.sent++;
      } else {
        result.failed++;
        if (error) result.errors.push(error);
      }
      // Pausa de 200ms entre mensajes para respetar el rate limit del plan gratuito de Kapso
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[kapso-send] Campaign done: ${result.sent} sent, ${result.failed} failed`);

    return new Response(
      JSON.stringify({ ok: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[kapso-send] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

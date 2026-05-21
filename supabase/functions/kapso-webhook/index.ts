// Webhook público de Kapso.ai → captura leads de WhatsApp en customer_profiles.
// No requiere JWT (Kapso llama desde fuera sin autenticación Supabase).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kapso-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    console.log("[kapso-webhook] Event:", payload?.event);

    if (payload?.event !== "message.received") {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = payload?.data ?? {};
    const contact = data?.contact ?? {};
    const rawPhone: string = contact?.phone ?? data?.from ?? data?.phone_number ?? "";
    const contactName: string = contact?.name ?? data?.contact_name ?? "WhatsApp Lead";

    if (!rawPhone) {
      console.warn("[kapso-webhook] No phone in payload");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = rawPhone.replace(/[^\d+]/g, "");

    const { data: existing } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("customer_profiles")
        .update({ lead_source: "WhatsApp", name: contactName })
        .eq("id", existing.id);
      console.log("[kapso-webhook] Updated:", phone);
    } else {
      const { error } = await supabase
        .from("customer_profiles")
        .insert({
          name: contactName,
          phone,
          email: `wp_${phone.replace(/\D/g, "")}@kapso.lead`,
          lead_source: "WhatsApp",
        });
      if (error) console.error("[kapso-webhook] Insert error:", error.message);
      else console.log("[kapso-webhook] New lead:", phone, contactName);
    }
  } catch (e) {
    console.error("[kapso-webhook] Error:", e instanceof Error ? e.message : String(e));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

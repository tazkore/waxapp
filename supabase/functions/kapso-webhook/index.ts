// kapso-webhook — captura leads WhatsApp + auto-responde con Waxa (chatbot IA).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kapso-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mdToWhatsApp(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [texto](url) -> texto
    .replace(/\*\*(.+?)\*\*/g, "*$1*")          // **bold** -> *bold*
    .replace(/#{1,6}\s/g, "")                  // quitar headers
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reply200 = () => new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const payload = await req.json();
    console.log("[kapso-webhook] Event:", payload?.event);
    if (payload?.event !== "message.received") return reply200();

    const data = payload?.data ?? {};
    const contact = data?.contact ?? {};
    const rawPhone: string = contact?.phone ?? data?.from ?? data?.phone_number ?? "";
    if (!rawPhone) return reply200();

    const phone = rawPhone.replace(/[^\d+]/g, "");
    const contactName: string = contact?.name ?? data?.contact_name ?? "WhatsApp Lead";
    const messageText: string = (
      data?.message?.text ?? data?.message?.body ?? data?.text ?? data?.body ?? ""
    ).trim();

    // 1. Guardar/actualizar lead en CRM
    const { data: existing } = await supabase
      .from("customer_profiles").select("id").eq("phone", phone).maybeSingle();
    if (existing?.id) {
      await supabase.from("customer_profiles")
        .update({ lead_source: "WhatsApp", name: contactName }).eq("id", existing.id);
    } else {
      await supabase.from("customer_profiles").insert({
        name: contactName, phone,
        email: `wp_${phone.replace(/\D/g, "")}@kapso.lead`,
        lead_source: "WhatsApp",
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const KAPSO_API_KEY = Deno.env.get("KAPSO_API_KEY");
    const KAPSO_PHONE_NUMBER_ID = Deno.env.get("KAPSO_PHONE_NUMBER_ID")?.trim();

    if (!GEMINI_API_KEY || !KAPSO_API_KEY || !KAPSO_PHONE_NUMBER_ID) {
      console.error("[kapso-webhook] Faltan secrets");
      return reply200();
    }

    // 2. Mensajes no-texto: respuesta genérica
    if (!messageText) {
      await fetch("https://api.kapso.ai/v1/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${KAPSO_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: KAPSO_PHONE_NUMBER_ID, to: phone, type: "text",
          text: { body: "Por ahora solo puedo responder mensajes de texto. ¿En qué te puedo ayudar?" },
        }),
      });
      return reply200();
    }

    // 3. Historial de conversación
    const { data: session } = await supabase
      .from("whatsapp_chat_sessions").select("messages").eq("phone", phone).maybeSingle();
    const history: Array<{ role: string; content: string }> = session?.messages ?? [];

    // 4. KB y catálogo en paralelo
    const [{ data: kb }, { data: products }] = await Promise.all([
      supabase.from("chatbot_kb").select("title,category,content").eq("is_active", true).limit(50),
      supabase.from("products").select("name,description,price,category,stock").eq("is_active", true).limit(40),
    ]);

    const kbContext = (kb ?? []).map((k: any) => `[${k.category}] ${k.title}: ${k.content}`).join("\n\n");
    const productCatalog = (products ?? []).map((p: any) =>
      `- ${p.name} | $${p.price} MXN | stock:${p.stock} | ${p.description ?? ""}`
    ).join("\n");

    const systemPrompt = `Eres "Waxa", agente de ventas IA de WAXAPP, tienda mexicana de productos premium de bienestar bio-tech.

PERSONALIDAD: Profesional, cálido, consultivo. Español de México. Sin emojis excesivos.
CONTEXTO: Respondes por *WhatsApp*. NO uses links URL — solo menciona nombres de productos.

REGLAS:
- Solo recomienda productos del CATÁLOGO.
- Menciona el 15% descuento de bienvenida al registrarse cuando sea natural.
- Productos legales (<0.3% THC), solo +18. Sin consejos médicos.
- 2-4 oraciones por respuesta. Usa *negritas* (asterisco simple) para enfatizar.
- Si no tienes la info, sugiere escribir a info@waxapp.mx.

BASE DE CONOCIMIENTO:\n${kbContext || "(sin entradas activas)"}

CATÁLOGO:\n${productCatalog || "(sin productos activos)"}`;

    // 5. Llamar Gemini
    const aiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: messageText },
          ],
        }),
      }
    );

    // Rate limit: responder con mensaje genérico
    if (aiRes.status === 429) {
      console.warn("[kapso-webhook] Gemini rate limit");
      await fetch("https://api.kapso.ai/v1/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${KAPSO_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: KAPSO_PHONE_NUMBER_ID, to: phone, type: "text",
          text: { body: "Recibimos tu mensaje, estamos un momento ocupados. Escríbenos a info@waxapp.mx si es urgente." },
        }),
      });
      return reply200();
    }

    if (!aiRes.ok) {
      console.error("[kapso-webhook] Gemini error:", aiRes.status);
      return reply200();
    }

    const aiData = await aiRes.json();
    const rawReply: string = aiData?.choices?.[0]?.message?.content ?? "";
    if (!rawReply) { console.error("[kapso-webhook] Gemini sin respuesta"); return reply200(); }

    const reply = mdToWhatsApp(rawReply);
    console.log("[kapso-webhook] Waxa ->", phone, ":", reply.slice(0, 120));

    // 6. Guardar historial (max 20 msgs)
    await supabase.from("whatsapp_chat_sessions").upsert({
      phone,
      messages: [...history, { role: "user", content: messageText }, { role: "assistant", content: reply }].slice(-20),
      updated_at: new Date().toISOString(),
    });

    // 7. Enviar respuesta por Kapso
    const kapsoRes = await fetch("https://api.kapso.ai/v1/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${KAPSO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number_id: KAPSO_PHONE_NUMBER_ID, to: phone, type: "text",
        text: { body: reply },
      }),
    });

    if (!kapsoRes.ok) {
      console.error("[kapso-webhook] Kapso send error:", kapsoRes.status, await kapsoRes.text().catch(() => ""));
    } else {
      console.log("[kapso-webhook] Mensaje enviado OK a", phone);
    }

  } catch (e) {
    console.error("[kapso-webhook] Error:", e instanceof Error ? e.message : String(e));
  }

  return reply200();
});

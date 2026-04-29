import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Result = { name: string; ok: boolean; latency_ms: number; error?: string; configured: boolean };

async function timed(name: string, configured: boolean, fn: () => Promise<void>): Promise<Result> {
  const start = Date.now();
  if (!configured) return { name, ok: false, latency_ms: 0, configured: false, error: "Secret no configurado" };
  try {
    await fn();
    return { name, ok: true, latency_ms: Date.now() - start, configured: true };
  } catch (e) {
    return {
      name,
      ok: false,
      latency_ms: Date.now() - start,
      configured: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const FIRECRAWL = Deno.env.get("FIRECRAWL_API_KEY");
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const CLIP = Deno.env.get("CLIP_API_KEY");
  const LOVABLE_AI = Deno.env.get("LOVABLE_API_KEY");
  const AMAZON_ID = Deno.env.get("AMAZON_LWA_CLIENT_ID");
  const JINA = Deno.env.get("JINA_API_KEY");
  const SCRAPINGBEE = Deno.env.get("SCRAPINGBEE_API_KEY");

  const checks = await Promise.all([
    timed("Firecrawl", !!FIRECRAWL, async () => {
      const r = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
        headers: { Authorization: `Bearer ${FIRECRAWL}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Resend", !!RESEND, async () => {
      const r = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${RESEND}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Clip", !!CLIP, async () => {
      // Endpoint público de salud
      const r = await fetch("https://api.payclip.com/", {
        headers: { Authorization: `Basic ${btoa(CLIP + ":")}` },
      });
      if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Lovable AI", !!LOVABLE_AI, async () => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/models", {
        headers: { Authorization: `Bearer ${LOVABLE_AI}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Amazon SP-API", !!AMAZON_ID, async () => {
      // Solo verifica que las credenciales LWA estén presentes; no hace llamada real
      if (!Deno.env.get("AMAZON_LWA_CLIENT_SECRET") || !Deno.env.get("AMAZON_REFRESH_TOKEN")) {
        throw new Error("Faltan AMAZON_LWA_CLIENT_SECRET o AMAZON_REFRESH_TOKEN");
      }
    }),
    timed("Jina Reader", true, async () => {
      const headers: Record<string, string> = {};
      if (JINA) headers.Authorization = `Bearer ${JINA}`;
      const r = await fetch("https://r.jina.ai/https://example.com", { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    timed("ScrapingBee", !!SCRAPINGBEE, async () => {
      const r = await fetch(`https://app.scrapingbee.com/api/v1/usage?api_key=${SCRAPINGBEE}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
  ]);

  return new Response(JSON.stringify({ checks }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

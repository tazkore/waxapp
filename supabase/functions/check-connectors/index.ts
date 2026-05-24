import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const FIRECRAWL = Deno.env.get("FIRECRAWL_API_KEY");
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const CLIP = Deno.env.get("CLIP_API_KEY");
  const GEMINI = Deno.env.get("GEMINI_API_KEY");
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
      const r = await fetch("https://api.payclip.com/", {
        headers: { Authorization: `Basic ${btoa(CLIP + ":")}` },
      });
      if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Google Gemini", !!GEMINI, async () => {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", {
        headers: { Authorization: `Bearer ${GEMINI}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    timed("Amazon SP-API", !!AMAZON_ID, async () => {
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

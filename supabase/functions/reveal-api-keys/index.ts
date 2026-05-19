// Reveal API keys — SOLO accesible por super_admin.
// Cada acceso queda registrado en api_key_access_log con auditoría completa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist de secretos que se pueden revelar — nada fuera de aquí
const ALLOWED_SECRETS = new Set([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWKS",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "CLIP_PUBLIC_KEY",
  "CLIP_API_KEY",
  "AMAZON_LWA_CLIENT_ID",
  "AMAZON_LWA_CLIENT_SECRET",
  "AMAZON_REFRESH_TOKEN",
]);

const PUBLIC_SECRETS = new Set([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "CLIP_PUBLIC_KEY",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente con JWT del usuario para identificarlo
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente con service role para verificar rol y escribir log
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      console.warn(`[reveal-api-keys] FORBIDDEN attempt by ${user.email} (${user.id})`);
      return new Response(JSON.stringify({ error: "Forbidden — super_admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requested: string[] = Array.isArray(body?.secret_names) ? body.secret_names : [];

    // Si no piden nada, devolver solo metadata (qué hay configurado, sin valores privados)
    if (requested.length === 0) {
      const inventory = Array.from(ALLOWED_SECRETS).map((name) => ({
        name,
        is_public: PUBLIC_SECRETS.has(name),
        is_configured: !!Deno.env.get(name),
        // Solo devolvemos valor si es público
        value: PUBLIC_SECRETS.has(name) ? (Deno.env.get(name) ?? null) : null,
      }));
      return new Response(JSON.stringify({ ok: true, inventory }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar y devolver valores solicitados
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    const result: Record<string, string | null> = {};
    const logRows: Array<Record<string, unknown>> = [];

    for (const name of requested) {
      if (!ALLOWED_SECRETS.has(name)) {
        result[name] = null;
        continue;
      }
      result[name] = Deno.env.get(name) ?? null;
      // Solo loguear las privadas
      if (!PUBLIC_SECRETS.has(name)) {
        logRows.push({
          user_id: user.id,
          user_email: user.email,
          secret_name: name,
          ip_address: ip,
          user_agent: ua,
        });
      }
    }

    if (logRows.length > 0) {
      await admin.from("api_key_access_log").insert(logRows);
    }

    return new Response(JSON.stringify({ ok: true, secrets: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[reveal-api-keys] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

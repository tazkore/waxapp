import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connection_id } = await req.json();
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn, error } = await admin
      .from("environment_connections")
      .select("*")
      .eq("id", connection_id)
      .maybeSingle();

    if (error || !conn) {
      return new Response(JSON.stringify({ error: "connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let urlOk = false;
    try {
      new URL(conn.project_url);
      urlOk = true;
    } catch {}

    // Check secret existence WITHOUT exposing values
    const anonSecretName = conn.anon_key_secret_name as string | null;
    const serviceSecretName = conn.service_key_secret_name as string | null;

    const anonConfigured = anonSecretName ? !!Deno.env.get(anonSecretName) : null;
    const serviceConfigured = serviceSecretName ? !!Deno.env.get(serviceSecretName) : null;

    // Optional ping to /auth/v1/health (anon)
    let reachable: boolean | null = null;
    if (urlOk && anonConfigured) {
      try {
        const anonKey = Deno.env.get(anonSecretName!)!;
        const r = await fetch(`${conn.project_url.replace(/\/$/, "")}/auth/v1/health`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        });
        reachable = r.ok;
      } catch {
        reachable = false;
      }
    }

    await admin
      .from("environment_connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", connection_id);

    return new Response(
      JSON.stringify({
        url_valid: urlOk,
        anon_secret_configured: anonConfigured,
        service_secret_configured: serviceConfigured,
        reachable,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

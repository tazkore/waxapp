import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
    const isSuper = roles?.some((r: any) => r.role === "super_admin");
    if (!isSuper) return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { url, search, limit = 50 } = await req.json();
    if (!url) throw new Error("url required");

    const { data: job, error: jerr } = await admin
      .from("import_jobs")
      .insert({ source_url: url, status: "mapping", created_by: ures.user.id })
      .select()
      .single();
    if (jerr) throw jerr;

    const fcRes = await fetch(`${GATEWAY}/v2/map`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FIRECRAWL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, search, limit, includeSubdomains: false }),
    });
    const data = await fcRes.json();
    if (!fcRes.ok) {
      await admin.from("import_jobs").update({ status: "failed", error: JSON.stringify(data) }).eq("id", job.id);
      throw new Error(`Firecrawl map failed [${fcRes.status}]: ${JSON.stringify(data)}`);
    }

    const links: string[] = data.links || data.data?.links || [];
    await admin
      .from("import_jobs")
      .update({ status: "pending", urls_found: links.length, discovered_urls: links })
      .eq("id", job.id);

    return new Response(JSON.stringify({ job_id: job.id, links }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firecrawl-map error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

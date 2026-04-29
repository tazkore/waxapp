import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { providerMap, type Provider } from "../_shared/scrape-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { url, limit = 50, provider = "firecrawl" } = await req.json();
    if (!url) throw new Error("url required");

    const { data: job, error: jerr } = await admin
      .from("import_jobs")
      .insert({ source_url: url, status: "mapping", created_by: ures.user.id })
      .select()
      .single();
    if (jerr) throw jerr;

    let links: string[] = [];
    try {
      links = await providerMap(provider as Provider, url, limit);
    } catch (err) {
      await admin.from("import_jobs").update({ status: "failed", error: String(err) }).eq("id", job.id);
      throw err;
    }

    await admin
      .from("import_jobs")
      .update({ status: "pending", urls_found: links.length, discovered_urls: links })
      .eq("id", job.id);

    return new Response(JSON.stringify({ job_id: job.id, links, provider }), {
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

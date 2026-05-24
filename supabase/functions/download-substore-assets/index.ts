import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", u.user.id);
    const ok = (roles ?? []).some((r: any) => r.role === "super_admin" || r.role === "admin");
    if (!ok) return json({ error: "Forbidden" }, 403);

    const { sub_store_slug, assets } = await req.json() as { sub_store_slug: string; assets: { kind: string; url: string }[] };
    if (!sub_store_slug || !Array.isArray(assets)) return json({ error: "params" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const results: any[] = [];
    for (const a of assets) {
      try {
        if (!a.url || !/^https?:\/\//.test(a.url)) { results.push({ kind: a.kind, url: a.url, error: "bad-url" }); continue; }
        const resp = await fetch(a.url, { redirect: "follow" });
        if (!resp.ok) { results.push({ kind: a.kind, url: a.url, error: `http-${resp.status}` }); continue; }
        const ct = resp.headers.get("content-type") ?? "";
        if (!ct.startsWith("image/")) { results.push({ kind: a.kind, url: a.url, error: "not-image" }); continue; }
        const buf = new Uint8Array(await resp.arrayBuffer());
        if (buf.length > MAX_BYTES) { results.push({ kind: a.kind, url: a.url, error: "too-large" }); continue; }
        const ext = (ct.split("/")[1] ?? "png").split(";")[0].replace("jpeg", "jpg").replace("svg+xml", "svg");
        const hash = await sha1(a.url);
        const path = `sub-stores/${sub_store_slug}/${a.kind}-${hash}.${ext}`;
        const { error: upErr } = await admin.storage.from("media").upload(path, buf, { contentType: ct, upsert: true });
        if (upErr) { results.push({ kind: a.kind, url: a.url, error: upErr.message }); continue; }
        const { data: pub } = admin.storage.from("media").getPublicUrl(path);
        results.push({ kind: a.kind, url: a.url, public_url: pub.publicUrl, path });
      } catch (e) {
        results.push({ kind: a.kind, url: a.url, error: e instanceof Error ? e.message : "err" });
      }
    }
    return json({ results });
  } catch (e) {
    console.error("download-assets err", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

async function sha1(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

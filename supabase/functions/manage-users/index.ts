import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
  const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: roleCheck } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
  if (!roleCheck) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const url = new URL(req.url);

  if (req.method === "GET") {
    // List all users with roles
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("*");
    const rolesMap: Record<string, string> = {};
    (roles ?? []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });

    const result = (users ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      role: rolesMap[u.id] || null,
    }));

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const { user_id, role } = await req.json();

    if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id and role required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Upsert role
    const { error } = await supabase.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id,role" });
    // If role changed, delete old one first
    await supabase.from("user_roles").delete().eq("user_id", user_id).neq("role", role);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === "DELETE") {
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("user_roles").delete().eq("user_id", user_id);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

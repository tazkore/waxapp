import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = ["super_admin", "admin", "moderator"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Allow admin OR super_admin
  const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (callerRoles ?? []).map((r: any) => r.role);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");
  if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "GET") {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    const rolesMap: Record<string, string[]> = {};
    (rolesData ?? []).forEach((r: any) => {
      rolesMap[r.user_id] = rolesMap[r.user_id] || [];
      rolesMap[r.user_id].push(r.role);
    });

    const pickHighest = (rs: string[] | undefined) => {
      if (!rs || rs.length === 0) return null;
      if (rs.includes("super_admin")) return "super_admin";
      if (rs.includes("admin")) return "admin";
      if (rs.includes("moderator")) return "moderator";
      return rs[0];
    };

    const result = (users ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: pickHighest(rolesMap[u.id]),
    }));

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const body = await req.json();

    if (body.action === "create_staff") {
      const { email, password, role } = body;
      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: "email, password and role required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!ALLOWED_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (role === "super_admin" && !isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Solo super_admin puede asignar super_admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: newUser.user.id, role });
      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id, role } = body;
    if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id and role required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (role === "super_admin" && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Solo super_admin puede asignar super_admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Protect: only super_admin can demote/modify another super_admin
    const { data: targetRoles } = await supabase.from("user_roles").select("role").eq("user_id", user_id);
    const targetIsSuper = (targetRoles ?? []).some((r: any) => r.role === "super_admin");
    if (targetIsSuper && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "No puedes modificar a un super_admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("user_roles").delete().eq("user_id", user_id);
    const { error } = await supabase.from("user_roles").insert({ user_id, role });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === "DELETE") {
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: targetRoles } = await supabase.from("user_roles").select("role").eq("user_id", user_id);
    const targetIsSuper = (targetRoles ?? []).some((r: any) => r.role === "super_admin");
    if (targetIsSuper && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "No puedes modificar a un super_admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("user_roles").delete().eq("user_id", user_id);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

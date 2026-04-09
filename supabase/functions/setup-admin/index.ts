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

  const adminEmail = "alan@grupoko.com";
  const genericPassword = "WaxApp2026!";

  // Check if user already exists
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const existing = (users ?? []).find((u: any) => u.email === adminEmail);

  if (existing) {
    // Ensure admin role exists
    const { data: roleData } = await supabase.from("user_roles").select("id").eq("user_id", existing.id).single();
    if (!roleData) {
      await supabase.from("user_roles").insert({ user_id: existing.id, role: "admin" });
    }
    return new Response(JSON.stringify({ message: "Admin user already exists. Role verified.", user_id: existing.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user with auto-confirm
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: genericPassword,
    email_confirm: true,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  await supabase.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

  return new Response(JSON.stringify({
    message: "Admin user created successfully",
    email: adminEmail,
    password: genericPassword,
    user_id: newUser.user.id,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

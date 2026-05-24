// Audit access — devuelve allow/deny por edge function admin para el usuario actual
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Check = {
  key: string;
  label: string;
  category: "function" | "route";
  required_role: "super_admin" | "admin" | "moderator" | "any";
  allowed: boolean;
  reason: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Usar el JWT del usuario para auth + consulta de roles (pasa RLS de user_roles)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // service_role solo para operaciones que requieren bypass de RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: roleRows } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((r: any) => r.role as string);
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isModerator = roles.includes("moderator");

  const decide = (
    required: Check["required_role"],
  ): { allowed: boolean; reason: string } => {
    if (required === "any") return { allowed: !!user, reason: "Usuario autenticado" };
    if (required === "super_admin") {
      return isSuperAdmin
        ? { allowed: true, reason: "Rol super_admin" }
        : { allowed: false, reason: "Requiere super_admin" };
    }
    if (required === "admin") {
      return isAdmin
        ? { allowed: true, reason: isSuperAdmin ? "super_admin (incluye admin)" : "Rol admin" }
        : { allowed: false, reason: "Requiere admin" };
    }
    if (required === "moderator") {
      const ok = isAdmin || isModerator;
      return ok
        ? { allowed: true, reason: "Rol suficiente" }
        : { allowed: false, reason: "Requiere moderator+" };
    }
    return { allowed: false, reason: "Desconocido" };
  };

  const routes: Omit<Check, "allowed" | "reason">[] = [
    { key: "overview", label: "Vista General", category: "route", required_role: "any" },
    { key: "inventory", label: "Inventario", category: "route", required_role: "any" },
    { key: "orders", label: "Pedidos y Envíos", category: "route", required_role: "any" },
    { key: "warehouses", label: "Almacenes", category: "route", required_role: "any" },
    { key: "shipping", label: "Guías de Envío", category: "route", required_role: "any" },
    { key: "clients", label: "Clientes y CRM", category: "route", required_role: "any" },
    { key: "marketing", label: "Marketing", category: "route", required_role: "any" },
    { key: "payments", label: "Pagos", category: "route", required_role: "any" },
    { key: "media", label: "Multimedia", category: "route", required_role: "any" },
    { key: "brands", label: "Marcas", category: "route", required_role: "any" },
    { key: "banners", label: "Banners", category: "route", required_role: "any" },
    { key: "blog", label: "Blog", category: "route", required_role: "any" },
    { key: "operations", label: "Operaciones", category: "route", required_role: "any" },
    { key: "purchasing", label: "Compras & Corporativo", category: "route", required_role: "any" },
    { key: "seo", label: "SEO", category: "route", required_role: "any" },
    { key: "theme", label: "Tema", category: "route", required_role: "any" },
    { key: "amazon", label: "Amazon Seller", category: "route", required_role: "admin" },
    { key: "chatbot", label: "Chatbot IA", category: "route", required_role: "admin" },
    { key: "integrations", label: "Integraciones", category: "route", required_role: "admin" },
    { key: "staff", label: "Staff & Usuarios", category: "route", required_role: "admin" },
    { key: "api-keys", label: "API & Conexiones", category: "route", required_role: "admin" },
    { key: "env-connections", label: "Conexiones de Entorno", category: "route", required_role: "admin" },
    { key: "settings", label: "Configuración", category: "route", required_role: "admin" },
  ];

  const functions: Omit<Check, "allowed" | "reason">[] = [
    { key: "manage-users", label: "manage-users", category: "function", required_role: "admin" },
    { key: "reveal-api-keys", label: "reveal-api-keys", category: "function", required_role: "super_admin" },
    { key: "test-environment-connection", label: "test-environment-connection", category: "function", required_role: "super_admin" },
    { key: "expire-pending-payments", label: "expire-pending-payments", category: "function", required_role: "admin" },
    { key: "clip-sync-payments", label: "clip-sync-payments", category: "function", required_role: "admin" },
    { key: "clip-config", label: "clip-config", category: "function", required_role: "admin" },
    { key: "register-manual-payment", label: "register-manual-payment", category: "function", required_role: "admin" },
    { key: "notify-payment-proof", label: "notify-payment-proof", category: "function", required_role: "admin" },
    { key: "amazon-sync", label: "amazon-sync", category: "function", required_role: "admin" },
    { key: "generate-blog-post", label: "generate-blog-post", category: "function", required_role: "admin" },
    { key: "generate-sitemap", label: "generate-sitemap", category: "function", required_role: "any" },
    { key: "create-shipment", label: "create-shipment", category: "function", required_role: "admin" },
    { key: "send-email", label: "send-email", category: "function", required_role: "admin" },
    { key: "audit-access", label: "audit-access", category: "function", required_role: "any" },
  ];

  const checks: Check[] = [...routes, ...functions].map((c) => {
    const d = decide(c.required_role);
    return { ...c, allowed: d.allowed, reason: d.reason };
  });

  return new Response(
    JSON.stringify({
      user: { id: user.id, email: user.email, roles },
      checked_at: new Date().toISOString(),
      checks,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

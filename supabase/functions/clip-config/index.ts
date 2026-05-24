import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Try env var first, then site_settings
  let publicKey = Deno.env.get("CLIP_PUBLIC_KEY");
  if (!publicKey) {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase.from("site_settings").select("value").eq("key", "clip_public_key").maybeSingle();
    if (data?.value) publicKey = typeof data.value === "string" ? data.value : String(data.value);
  }

  if (!publicKey) {
    return new Response(JSON.stringify({ error: "Clip no configurado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ public_key: publicKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

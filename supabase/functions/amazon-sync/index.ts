import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Amazon Selling Partner API (SP-API) sync.
// Requires the following secrets in Lovable Cloud:
//   AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_REFRESH_TOKEN
// SP-API Endpoint regions:
//   na: https://sellingpartnerapi-na.amazon.com (US/CA/MX)
//   eu: https://sellingpartnerapi-eu.amazon.com
//   fe: https://sellingpartnerapi-fe.amazon.com

const SP_ENDPOINTS: Record<string, string> = {
  na: "https://sellingpartnerapi-na.amazon.com",
  eu: "https://sellingpartnerapi-eu.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("AMAZON_LWA_CLIENT_ID");
  const clientSecret = Deno.env.get("AMAZON_LWA_CLIENT_SECRET");
  const refreshToken = Deno.env.get("AMAZON_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Amazon credentials. Set AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_REFRESH_TOKEN.");
  }

  const r = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!r.ok) throw new Error(`LWA auth failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token as string;
}

async function spFetch(endpoint: string, path: string, token: string, params?: Record<string, string>) {
  const url = new URL(endpoint + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), {
    headers: { "x-amz-access-token": token, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`SP-API ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await admin.from("amazon_config").select("*").limit(1).maybeSingle();
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Amazon no configurado. Guarda primero el seller_id y marketplace." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = SP_ENDPOINTS[cfg.region ?? "na"];
    const marketplaceId = cfg.marketplace_id ?? "A1AM78C64UM0Y8";

    let token: string;
    try {
      token = await getAccessToken();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("amazon_config").update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "auth_error: " + msg,
      }).eq("id", cfg.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { products: 0, orders: 0, errors: [] as string[] };

    // 1. Sync FBA inventory
    try {
      const inv = await spFetch(endpoint, "/fba/inventory/v1/summaries", token, {
        granularityType: "Marketplace",
        granularityId: marketplaceId,
        marketplaceIds: marketplaceId,
      });
      const summaries = inv?.payload?.inventorySummaries ?? [];
      for (const s of summaries) {
        if (!s.asin) continue;
        await admin.from("amazon_products").upsert({
          asin: s.asin,
          sku: s.sellerSku ?? null,
          title: s.productName ?? s.asin,
          quantity: s.totalQuantity ?? 0,
          fulfillment_channel: "AMAZON",
          status: "active",
          raw: s,
          synced_at: new Date().toISOString(),
        }, { onConflict: "asin" });
        results.products++;
      }
    } catch (e) {
      results.errors.push("inventory: " + (e instanceof Error ? e.message : String(e)));
    }

    // 2. Sync recent orders (last 30 days)
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ord = await spFetch(endpoint, "/orders/v0/orders", token, {
        MarketplaceIds: marketplaceId,
        CreatedAfter: since,
      });
      const orders = ord?.payload?.Orders ?? [];
      for (const o of orders) {
        await admin.from("amazon_orders").upsert({
          amazon_order_id: o.AmazonOrderId,
          purchase_date: o.PurchaseDate,
          order_status: o.OrderStatus,
          fulfillment_channel: o.FulfillmentChannel,
          total: parseFloat(o.OrderTotal?.Amount ?? "0"),
          buyer_email: o.BuyerEmail ?? null,
          raw: o,
          synced_at: new Date().toISOString(),
        }, { onConflict: "amazon_order_id" });
        results.orders++;
      }
    } catch (e) {
      results.errors.push("orders: " + (e instanceof Error ? e.message : String(e)));
    }

    await admin.from("amazon_config").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: results.errors.length ? "partial: " + results.errors.join("; ") : "success",
    }).eq("id", cfg.id);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("amazon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

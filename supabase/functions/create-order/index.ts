import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { customer_name, customer_email, shipping_address, items, shipping_method } = body;

    // Input validation
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length === 0 || customer_name.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid customer_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer_email || typeof customer_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid customer_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid items array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.title || typeof item.title !== "string") {
        return new Response(JSON.stringify({ error: "Each item must have a title" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) {
        return new Response(JSON.stringify({ error: "Each item must have a valid qty (1-100)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof item.price !== "number" || item.price <= 0) {
        return new Response(JSON.stringify({ error: "Each item must have a valid price > 0" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate shipping method
    const validShippingMethods = ["standard", "express", "pickup"];
    if (!shipping_method || !validShippingMethods.includes(shipping_method)) {
      return new Response(JSON.stringify({ error: "Invalid shipping_method" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate total server-side from item prices
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
    const shippingCost = shipping_method === "express" ? 250 : shipping_method === "standard" ? 99 : 0;
    const total = subtotal + shippingCost;

    if (total <= 0) {
      return new Response(JSON.stringify({ error: "Total must be greater than 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate order number server-side
    const orderNumber = `WX-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase.from("orders").insert({
      order_number: orderNumber,
      customer_name: customer_name.trim(),
      customer_email: customer_email.trim().toLowerCase(),
      shipping_address: shipping_address || null,
      total,
      items,
      status: "pending",
    }).select().single();

    if (error) {
      console.error("Order insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      order_number: orderNumber,
      total,
      shipping_cost: shippingCost,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-order error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

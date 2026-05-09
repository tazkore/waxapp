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
    const { customer_name, customer_email, shipping_address, items, shipping_method, affiliate_code, loyalty_points_used } = body;

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

    // Apply loyalty points (1 pt = $1 MXN), capped at subtotal and at user's available balance
    let pointsToRedeem = 0;
    if (Number.isInteger(loyalty_points_used) && loyalty_points_used > 0) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id, loyalty_points")
        .eq("email", customer_email.trim().toLowerCase())
        .maybeSingle();
      const available = Number(clientRow?.loyalty_points ?? 0);
      pointsToRedeem = Math.min(loyalty_points_used, available, subtotal);
    }

    const total = Math.max(0, subtotal - pointsToRedeem) + shippingCost;

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

    // Send admin notification email (fire-and-forget)
    try {
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 200 });
        const adminEmails = (allUsers ?? []).filter((u: any) => adminIds.includes(u.id)).map((u: any) => u.email).filter(Boolean);

        if (adminEmails.length > 0) {
          const itemsHtml = items.map((i: any) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${i.title}${i.variant ? ` (${i.variant})` : ''}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">$${(i.price * i.qty).toLocaleString()}</td></tr>`
          ).join('');

          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

          if (LOVABLE_API_KEY && RESEND_API_KEY) {
            await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "WAXAPP <onboarding@resend.dev>",
                to: adminEmails,
                subject: `🛒 Nuevo Pedido ${orderNumber} — $${total.toLocaleString()} MXN`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
                  <div style="text-align:center;margin-bottom:20px">
                    <h1 style="color:#8B5CF6;font-size:24px;margin:0">WAXAPP</h1>
                    <p style="color:#6b7280;margin:4px 0 0;font-size:13px">Notificación de Nuevo Pedido</p>
                  </div>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
                  <div style="background:#faf5ff;border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid #8B5CF6">
                    <p style="margin:0;font-size:13px;color:#6b7280">Pedido</p>
                    <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#8B5CF6;font-family:monospace">${orderNumber}</p>
                  </div>
                  <table style="width:100%;margin-bottom:16px;font-size:14px;color:#374151">
                    <tr><td style="padding:4px 0;color:#6b7280">Cliente:</td><td style="padding:4px 0;font-weight:600">${customer_name.trim()}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280">Email:</td><td style="padding:4px 0">${customer_email.trim()}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280">Dirección:</td><td style="padding:4px 0">${shipping_address || 'Recoger en tienda'}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280">Envío:</td><td style="padding:4px 0">${shipping_method}</td></tr>
                  </table>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <thead><tr style="background:#f9fafb"><th style="padding:6px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">Producto</th><th style="padding:6px 10px;text-align:center;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">Cant.</th><th style="padding:6px 10px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">Subtotal</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>
                  <div style="text-align:right;padding:12px;background:#f3f4f6;border-radius:8px">
                    <span style="font-size:12px;color:#6b7280">Envío: $${shippingCost === 0 ? 'Gratis' : shippingCost.toLocaleString()}</span><br/>
                    <span style="font-size:20px;font-weight:bold;color:#1f2937">Total: $${total.toLocaleString()} MXN</span>
                  </div>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                  <p style="color:#9ca3af;font-size:11px;text-align:center">Notificación automática de WAXAPP — Panel de administración</p>
                </div>`,
              }),
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("Admin notification email error:", emailErr);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: data.id,
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

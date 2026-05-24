import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { customer_name, customer_email, shipping_address, items, shipping_method, affiliate_code, loyalty_points_used, origin_domain } = body;

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

    // Generate order number server-side — timestamp base-36 + 3 random hex chars para evitar colisiones
    const tsSegment = Date.now().toString(36).toUpperCase().slice(-5);
    const randSegment = Math.floor(Math.random() * 0xfff).toString(16).toUpperCase().padStart(3, '0');
    const orderNumber = `WX-${tsSegment}${randSegment}`;

    const { data, error } = await supabase.from("orders").insert({
      order_number: orderNumber,
      customer_name: customer_name.trim(),
      customer_email: customer_email.trim().toLowerCase(),
      shipping_address: shipping_address || null,
      total,
      items,
      status: "pending",
      origin_domain: typeof origin_domain === "string" && origin_domain.length > 0 && origin_domain.length <= 255
        ? origin_domain.toLowerCase()
        : null,
    }).select().single();

    if (error) {
      console.error("Order insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redeem loyalty points (deduct from balance)
    if (pointsToRedeem > 0) {
      try {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("id, loyalty_points")
          .eq("email", customer_email.trim().toLowerCase())
          .maybeSingle();
        if (clientRow) {
          await supabase
            .from("clients")
            .update({ loyalty_points: Math.max(0, Number(clientRow.loyalty_points) - pointsToRedeem) })
            .eq("id", clientRow.id);
        }
      } catch (e) {
        console.error("loyalty redeem error:", e);
      }
    }

    // Link to affiliate (track sale)
    if (affiliate_code && typeof affiliate_code === "string") {
      try {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id, commission_pct, total_sales, pending_payout")
          .eq("code", affiliate_code)
          .eq("status", "approved")
          .maybeSingle();
        if (aff) {
          const gross = Number(total);
          const tax = +(gross * 0.16).toFixed(2);
          const netProfit = +(gross - shippingCost - tax).toFixed(2);
          const commission = +(netProfit * (Number(aff.commission_pct) / 100)).toFixed(2);
          await supabase.from("affiliate_sales").insert({
            affiliate_id: aff.id,
            order_id: data.id,
            order_number: orderNumber,
            gross,
            shipping: shippingCost,
            tax,
            net_profit: netProfit,
            commission,
            status: "pending",
          });
          await supabase
            .from("affiliates")
            .update({
              total_sales: Number(aff.total_sales) + gross,
              pending_payout: Number(aff.pending_payout) + commission,
            })
            .eq("id", aff.id);
        }
      } catch (e) {
        console.error("affiliate link error:", e);
      }
    }

    // Send admin notification email (fire-and-forget)
    try {
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const listResult = await supabase.auth.admin.listUsers({ perPage: 200 });
        const allUsers = listResult?.data?.users ?? [];
        const adminEmails = allUsers.filter((u: any) => adminIds.includes(u.id)).map((u: any) => u.email).filter(Boolean);

        if (adminEmails.length > 0) {
          const itemsHtml = items.map((i: any) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${i.title}${i.variant ? ` (${i.variant})` : ''}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">$${(i.price * i.qty).toLocaleString()}</td></tr>`
          ).join('');

          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

          if (RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "WAXAPP <onboarding@resend.dev>",
                to: adminEmails,
                subject: `🛒 Nuevo Pedido ${orderNumber} — $${total.toLocaleString()} MXN`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
                  <div style="text-align:center;margin-bottom:20px">
                    <h1 style="color:#0A0A0A;font-size:24px;margin:0">WAXAPP</h1>
                    <p style="color:#6b7280;margin:4px 0 0;font-size:13px">Notificación de Nuevo Pedido</p>
                  </div>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
                  <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid #00E676">
                    <p style="margin:0;font-size:13px;color:#6b7280">Pedido</p>
                    <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#00E676;font-family:monospace">${orderNumber}</p>
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

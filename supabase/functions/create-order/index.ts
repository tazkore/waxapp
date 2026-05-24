import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function generateOxxoReference(orderNumber: string): string {
  const cleanNum = orderNumber.replace(/[^A-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < cleanNum.length; i++) {
    hash = cleanNum.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absoluteHash = Math.abs(hash).toString().padEnd(10, '0').slice(0, 10);
  return `930012${absoluteHash}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_name,
      customer_email,
      shipping_address,
      items,
      shipping_method,
      affiliate_code,
      loyalty_points_used,
      origin_domain,
      payment_method,
    } = body;

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

    // Validate payment method
    const validPaymentMethods = ["card", "oxxo", "transfer"];
    const resolvedPaymentMethod = payment_method && validPaymentMethods.includes(payment_method) ? payment_method : "card";

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
      payment_method: resolvedPaymentMethod,
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
                from: "WAXAPP <noreply@updates.grupoko.com>",
                to: adminEmails,
                subject: `🛒 Nuevo Pedido ${orderNumber} [${resolvedPaymentMethod.toUpperCase()}] — $${total.toLocaleString()} MXN`,
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
                    <tr><td style="padding:4px 0;color:#6b7280">Método de Envío:</td><td style="padding:4px 0">${shipping_method}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280">Método de Pago:</td><td style="padding:4px 0;font-weight:600;text-transform:uppercase">${resolvedPaymentMethod}</td></tr>
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

    // Send customer notification email (fire-and-forget)
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const itemsHtml = items.map((i: any) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${i.title}${i.variant ? ` (${i.variant})` : ''}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">$${(i.price * i.qty).toLocaleString()}</td></tr>`
        ).join('');

        let subject = `🛍️ Confirmación de Pedido ${orderNumber} — WAXAPP`;
        let paymentInstructionsHtml = "";

        if (resolvedPaymentMethod === "oxxo") {
          subject = `📄 Ficha de Pago OXXO — Pedido ${orderNumber} — WAXAPP`;
          const oxxoReference = generateOxxoReference(orderNumber);

          paymentInstructionsHtml = `
            <div style="background:#fffcf0;border:1px solid #ffeeba;border-radius:10px;padding:20px;margin-bottom:20px;border-left:4px solid #d39e00">
              <h3 style="color:#856404;margin-top:0;font-size:16px">Instrucciones de Pago en OXXO</h3>
              <p style="margin:0 0 12px;font-size:13px;color:#856404">Lleva esta información a cualquier tienda OXXO para realizar tu pago en efectivo:</p>
              <div style="text-align:center;margin:15px 0;background:#fff;border:1px solid #e2e8f0;padding:12px;border-radius:8px">
                <p style="margin:0;font-size:10px;color:#718096;text-transform:uppercase;letter-spacing:1px">Referencia de Pago (OXXO Pay)</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#0A0A0A;font-family:monospace;letter-spacing:2px">${oxxoReference}</p>
              </div>
              <ol style="margin:0;padding-left:18px;font-size:13px;color:#856404;line-height:1.6">
                <li>Acude a tu tienda OXXO más cercana.</li>
                <li>Dile al cajero que quieres realizar un pago de servicio con <strong>OXXO Pay</strong>.</li>
                <li>Proporciona el número de referencia arriba indicado. El cajero te cobrará en efectivo.</li>
                <li>Guarda tu comprobante. Tu pedido se procesará una vez confirmado el pago.</li>
              </ol>
            </div>
          `;
        } else if (resolvedPaymentMethod === "transfer") {
          subject = `🏦 Datos de Transferencia SPEI — Pedido ${orderNumber} — WAXAPP`;
          
          let bankAccountsHtml = "";
          try {
            const { data: accounts } = await supabase
              .from("bank_accounts")
              .select("*")
              .eq("is_active", true)
              .order("display_order");
            
            if (accounts && accounts.length > 0) {
              bankAccountsHtml = accounts.map((acc: any) => `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
                  <p style="margin:0 0 5px;font-weight:bold;color:#1e293b;font-size:14px">${acc.bank_name}</p>
                  <table style="width:100%;font-size:12px;color:#475569">
                    <tr><td style="width:90px;padding:2px 0;color:#64748b">Titular:</td><td style="padding:2px 0;font-weight:600;color:#0f172a">${acc.account_holder}</td></tr>
                    ${acc.clabe ? `<tr><td style="padding:2px 0;color:#64748b">CLABE:</td><td style="padding:2px 0;font-family:monospace;font-weight:600;color:#0f172a">${acc.clabe}</td></tr>` : ''}
                    ${acc.account_number ? `<tr><td style="padding:2px 0;color:#64748b">Cuenta:</td><td style="padding:2px 0;font-family:monospace;font-weight:600;color:#0f172a">${acc.account_number}</td></tr>` : ''}
                    ${acc.notes ? `<tr><td style="padding:2px 0;color:#64748b">Notas:</td><td style="padding:2px 0;font-style:italic">${acc.notes}</td></tr>` : ''}
                  </table>
                </div>
              `).join('');
            } else {
              bankAccountsHtml = `<p style="font-size:13px;color:#ef4444;font-style:italic">Cuentas bancarias temporales no disponibles. Por favor contáctanos para facilitarte los datos.</p>`;
            }
          } catch (e) {
            console.error("Error fetching bank accounts for customer email:", e);
            bankAccountsHtml = `<p style="font-size:13px;color:#ef4444;font-style:italic">Error al cargar datos bancarios. Por favor contáctanos.</p>`;
          }

          paymentInstructionsHtml = `
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px;margin-bottom:20px;border-left:4px solid #0284c7">
              <h3 style="color:#0369a1;margin-top:0;font-size:16px">Instrucciones de Transferencia SPEI</h3>
              <p style="margin:0 0 12px;font-size:13px;color:#0369a1">Realiza tu transferencia electrónica por el monto total a cualquiera de las siguientes cuentas:</p>
              ${bankAccountsHtml}
              <ol style="margin:12px 0 0;padding-left:18px;font-size:13px;color:#0369a1;line-height:1.6">
                <li>Ingresa a la banca móvil de tu banco.</li>
                <li>Registra la cuenta CLABE indicada arriba.</li>
                <li>Transfiere el monto exacto del total del pedido: <strong>$${total.toLocaleString()} MXN</strong>.</li>
                <li>En la referencia o concepto de pago, coloca tu folio: <strong>${orderNumber}</strong>.</li>
                <li>Responde a este correo con tu comprobante de pago para liberar tu orden.</li>
              </ol>
            </div>
          `;
        } else {
          paymentInstructionsHtml = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:20px;border-left:4px solid #22c55e">
              <h3 style="color:#15803d;margin-top:0;font-size:16px">Pago en proceso con Clip</h3>
              <p style="margin:0;font-size:13px;color:#15803d">
                Tu pago está siendo verificado a través de la pasarela de pago seguro Clip. 
                Una vez confirmado, prepararemos y enviaremos tu pedido.
              </p>
            </div>
          `;
        }

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "WAXAPP <noreply@updates.grupoko.com>",
            to: [customer_email],
            subject: subject,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
              <div style="text-align:center;margin-bottom:20px">
                <h1 style="color:#0A0A0A;font-size:24px;margin:0">WAXAPP</h1>
                <p style="color:#6b7280;margin:4px 0 0;font-size:13px">Confirmación de Pedido</p>
              </div>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
              
              <p style="font-size:14px;color:#374151">Hola <strong>${customer_name}</strong>,</p>
              <p style="font-size:14px;color:#374151;line-height:1.5">
                Gracias por comprar en WAXAPP. Hemos recibido tu pedido con el folio <strong>${orderNumber}</strong>. 
                A continuación encontrarás los detalles del pedido y los pasos para completar tu pago.
              </p>

              ${paymentInstructionsHtml}

              <table style="width:100%;margin-bottom:16px;font-size:14px;color:#374151">
                <tr><td style="padding:4px 0;color:#6b7280">Folio:</td><td style="padding:4px 0;font-family:monospace;font-weight:600">${orderNumber}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280">Dirección de Envío:</td><td style="padding:4px 0">${shipping_address || 'Recoger en tienda'}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280">Método de Envío:</td><td style="padding:4px 0">${shipping_method}</td></tr>
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
              <p style="color:#9ca3af;font-size:11px;text-align:center">Si tienes alguna pregunta, por favor contáctanos respondiendo directamente a este correo.</p>
              <p style="color:#9ca3af;font-size:11px;text-align:center">WAXAPP — Todos los derechos reservados.</p>
            </div>`,
          }),
        });
      }
    } catch (custEmailErr) {
      console.error("Customer email delivery error:", custEmailErr);
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

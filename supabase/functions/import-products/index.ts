import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) + "-" + Math.random().toString(36).slice(2, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
    if (!roles?.some((r: any) => r.role === "super_admin"))
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { job_id, products, overwrite = false } = await req.json();
    if (!job_id || !Array.isArray(products)) throw new Error("job_id and products[] required");

    await admin.from("import_jobs").update({ status: "importing" }).eq("id", job_id);

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    const product_ids: string[] = [];
    const duplicates: Array<{ index: number; name: string; sku: string | null; existing_id: string; reason: string }> = [];

    for (let pi = 0; pi < products.length; pi++) {
      const p = products[pi];
      try {
        // Check for existing product by sku (case-insensitive) or by exact name
        let existingId: string | null = null;
        let existingReason = "";
        if (p.sku) {
          const skuTrim = String(p.sku).slice(0, 60);
          const { data: dupSku } = await admin.from("products").select("id").ilike("sku", skuTrim).limit(1).maybeSingle();
          if (dupSku?.id) { existingId = dupSku.id; existingReason = `SKU "${skuTrim}" ya existe`; }
        }
        if (!existingId && p.name) {
          const { data: dupName } = await admin.from("products").select("id").eq("name", String(p.name).slice(0, 200)).limit(1).maybeSingle();
          if (dupName?.id) { existingId = dupName.id; existingReason = `nombre "${p.name}" ya existe`; }
        }

        if (existingId && !overwrite) {
          duplicates.push({ index: pi, name: p.name, sku: p.sku ?? null, existing_id: existingId, reason: existingReason });
          continue;
        }

        // download first image
        let image_url: string | null = null;
        const firstImg = (p.images || [])[0];
        if (firstImg) {
          try {
            const imgRes = await fetch(firstImg);
            if (imgRes.ok) {
              const buf = new Uint8Array(await imgRes.arrayBuffer());
              const ct = imgRes.headers.get("content-type") || "image/jpeg";
              const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
              const path = `imported/${job_id}/${crypto.randomUUID()}.${ext}`;
              const { error: upErr } = await admin.storage.from("media").upload(path, buf, { contentType: ct, upsert: false });
              if (!upErr) {
                const { data: pub } = admin.storage.from("media").getPublicUrl(path);
                image_url = pub.publicUrl;
              }
            }
          } catch (e) {
            console.error("img dl err", e);
          }
        }

        const payload: any = {
          name: String(p.name).slice(0, 200),
          description: p.description ? String(p.description).slice(0, 4000) : null,
          price: Number.isFinite(p.price) ? Number(p.price) : 0,
          category: p.category || null,
          sku: p.sku ? String(p.sku).slice(0, 60) : null,
        };
        if (image_url) payload.image_url = image_url;

        if (existingId && overwrite) {
          // Update existing — preserve slug/stock/is_active
          const { error: updErr } = await admin.from("products").update(payload).eq("id", existingId);
          if (updErr) {
            errors.push(`${p.name}: ${updErr.message}`);
          } else {
            updated++;
            product_ids.push(existingId);
          }
        } else {
          const insertRow = { ...payload, stock: 0, slug: slugify(p.name), is_active: false, image_url };
          const { data: ins, error: insErr } = await admin.from("products").insert(insertRow).select("id").single();
          if (insErr) {
            // Race condition or other duplicate: surface as duplicate if 23505
            if ((insErr as any).code === "23505") {
              duplicates.push({ index: pi, name: p.name, sku: p.sku ?? null, existing_id: "", reason: insErr.message });
            } else {
              errors.push(`${p.name}: ${insErr.message}`);
            }
          } else {
            imported++;
            if (ins?.id) product_ids.push(ins.id);
          }
        }
      } catch (e) {
        errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const hasAnySuccess = imported + updated > 0;
    await admin
      .from("import_jobs")
      .update({
        status: !hasAnySuccess && (errors.length || duplicates.length) ? "failed" : "completed",
        products_imported: imported + updated,
        error: errors.length ? errors.slice(0, 20).join("\n") : null,
      })
      .eq("id", job_id);

    return new Response(JSON.stringify({ imported, updated, errors, duplicates, product_ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-products error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

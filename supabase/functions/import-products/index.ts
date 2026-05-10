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

    for (const p of products) {
      try {
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

        const insert = {
          name: String(p.name).slice(0, 200),
          description: p.description ? String(p.description).slice(0, 4000) : null,
          price: Number.isFinite(p.price) ? Number(p.price) : 0,
          stock: 0,
          category: p.category || null,
          sku: p.sku ? String(p.sku).slice(0, 60) : null,
          image_url,
          slug: slugify(p.name),
          is_active: false,
        };
        const { data: ins, error: insErr } = await admin.from("products").insert(insert).select("id").single();
        if (insErr) {
          errors.push(`${p.name}: ${insErr.message}`);
        } else {
          imported++;
          if (ins?.id) product_ids.push(ins.id);
        }
      } catch (e) {
        errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await admin
      .from("import_jobs")
      .update({
        status: errors.length && imported === 0 ? "failed" : "completed",
        products_imported: imported,
        error: errors.length ? errors.slice(0, 20).join("\n") : null,
      })
      .eq("id", job_id);

    return new Response(JSON.stringify({ imported, errors, product_ids }), {
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

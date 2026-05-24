// parse-product-csv: validates CSV/Sheets data and normalizes rows for product import.
// Returns { rows: NormalizedRow[], errors: { row: number, field: string, message: string }[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const errorResponse = (code: string, message: string, status = 400, details?: unknown) =>
  new Response(JSON.stringify({ error: { code, message, details } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Minimal CSV parser supporting quoted fields and embedded commas/newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (c === "\r") {
        // ignore, handled by \n
      } else {
        cur += c;
      }
    }
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim()));
}

// Convert Google Sheets share URL to CSV export URL.
function googleSheetsCsvUrl(url: string): string | null {
  try {
    const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([^\/]+)/);
    if (!m) return null;
    const id = m[1];
    const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

const SLUGIFY = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_BODY", "Body must be JSON");
  }

  const { csv_text, sheet_url, mapping } = body ?? {};
  if (!csv_text && !sheet_url) {
    return errorResponse("INVALID_BODY", "Provide csv_text or sheet_url");
  }
  if (!mapping || typeof mapping !== "object") {
    return errorResponse("INVALID_BODY", "mapping object is required");
  }

  // Auth
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: ures } = await userClient.auth.getUser();
  if (!ures?.user) return errorResponse("UNAUTHORIZED", "Sign in required", 401);
  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
  if (!roles?.some((r: any) => r.role === "super_admin" || r.role === "admin")) {
    return errorResponse("FORBIDDEN", "Admin role required", 403);
  }

  // Resolve text
  let text = csv_text as string | undefined;
  if (!text && sheet_url) {
    const csvUrl = googleSheetsCsvUrl(sheet_url) ?? sheet_url;
    try {
      const r = await fetch(csvUrl);
      if (!r.ok) return errorResponse("PROVIDER_FAIL", `CSV fetch failed [${r.status}]`, 400);
      text = await r.text();
    } catch (e) {
      return errorResponse("PROVIDER_FAIL", `CSV fetch error: ${(e as Error).message}`, 400);
    }
  }
  if (!text) return errorResponse("INVALID_BODY", "Empty CSV");

  const matrix = parseCsv(text);
  if (matrix.length < 2) {
    return errorResponse("INVALID_BODY", "CSV needs a header row and at least one data row");
  }
  const header = matrix[0].map((h) => h.trim());
  const dataRows = matrix.slice(1);

  const colIndex = (key: string): number => {
    const colName = mapping[key];
    if (!colName) return -1;
    return header.findIndex((h) => h.toLowerCase() === String(colName).toLowerCase());
  };

  const idx = {
    name: colIndex("name"),
    price: colIndex("price"),
    sku: colIndex("sku"),
    image_url: colIndex("image_url"),
    description: colIndex("description"),
    category: colIndex("category"),
    gtin: colIndex("gtin"),
    brand_name: colIndex("brand_name"),
    stock: colIndex("stock"),
  };

  if (idx.name === -1) {
    return errorResponse("INVALID_BODY", `'name' column not found in CSV. Headers: ${header.join(", ")}`);
  }

  const rows: any[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // Pre-fetch existing slugs to detect collisions client-side later (return suggestions)
  const { data: existing } = await admin.from("products").select("slug");
  const existingSlugs = new Set((existing ?? []).map((p: any) => p.slug).filter(Boolean));

  dataRows.forEach((r, i) => {
    const rowNum = i + 2;
    const name = (r[idx.name] || "").trim();
    if (!name) {
      errors.push({ row: rowNum, field: "name", message: "Nombre obligatorio" });
      return;
    }
    const priceStr = idx.price >= 0 ? (r[idx.price] || "").trim() : "";
    const price = Number(priceStr.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (priceStr && Number.isNaN(price)) {
      errors.push({ row: rowNum, field: "price", message: `Precio inválido: "${priceStr}"` });
    }
    let slug = SLUGIFY(name);
    let n = 2;
    while (existingSlugs.has(slug)) slug = `${SLUGIFY(name)}-${n++}`;
    existingSlugs.add(slug);

    const stockStr = idx.stock >= 0 ? (r[idx.stock] || "").trim() : "";
    const stock = Number(stockStr) || 0;

    rows.push({
      name,
      slug,
      price: Number.isFinite(price) ? price : 0,
      sku: idx.sku >= 0 ? r[idx.sku]?.trim() || null : null,
      image_url: idx.image_url >= 0 ? r[idx.image_url]?.trim() || null : null,
      description: idx.description >= 0 ? r[idx.description]?.trim() || null : null,
      category: idx.category >= 0 ? r[idx.category]?.trim() || null : null,
      gtin: idx.gtin >= 0 ? r[idx.gtin]?.trim() || null : null,
      brand_name: idx.brand_name >= 0 ? r[idx.brand_name]?.trim() || null : null,
      stock,
      meta_title: name.slice(0, 60),
      meta_description: idx.description >= 0 ? (r[idx.description] || "").slice(0, 160) : null,
      is_active: false,
    });
  });

  return new Response(
    JSON.stringify({ ok: true, header, rows, errors, total: dataRows.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

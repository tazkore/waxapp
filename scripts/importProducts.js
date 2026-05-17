/**
 * scripts/importProducts.js
 * Parsea evapemayoreo.csv → src/data/productos_limpios.json
 * Uso: npm run import:products
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_PATH = path.join(__dirname, "../evapemayoreo.csv");
const OUT_PATH = path.join(__dirname, "../src/data/productos_limpios.json");

// ── Helpers ─────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (!raw || !raw.trim()) return 0;
  return parseFloat(raw.replace(/[^\d.]/g, "")) || 0;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractHits(name) {
  const m = name.match(/([\d,]+)\s*(hits|golpes)/i);
  return m ? m[0] : null;
}

function generateSeoTitle(name, price, onSale, originalPrice) {
  const brand = name.split(" ")[0];
  if (onSale) {
    const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
    return `${name} — ${pct}% OFF | WAXAPP Mayoreo`;
  }
  return `${name} — $${price} MXN | ${brand} al Mayoreo WAXAPP`;
}

// ── Parser CSV manual (sin dependencias externas) ──────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(raw) {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV no encontrado: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  // Deduplica por web_scraper_order (el CSV tiene 3 copias del catálogo)
  const seen = new Set();
  const unique = rows.filter((r) => {
    const key = r.web_scraper_order;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const productos = unique
    .filter((r) => r.data && r.data.trim()) // necesita nombre
    .map((r, idx) => {
      const name = (r.data || "").trim();
      const priceRaw = r.price2 || r.price3 || "";
      const originalRaw = r.price || "";

      const price = parsePrice(priceRaw);
      const originalPrice = parsePrice(originalRaw);
      const onSale = (r.data3 || "").trim() === "Oferta" || (r.data7 || "").trim() === "Oferta";

      // Imagen: preferir image, luego image2
      const image = (r.image || r.image2 || r.image3 || "").trim();

      // Descripción: si existe, limpiarla
      const description = (r.description || "").trim();

      const hits = extractHits(name);

      return {
        id: `prod-${r.web_scraper_order || idx}`,
        name,
        slug: slugify(name),
        price: price || 0,
        originalPrice: onSale && originalPrice > price ? originalPrice : price,
        onSale: onSale && originalPrice > price,
        image,
        images: [image].filter(Boolean),
        description: description || `${name} — disponible en WAXAPP al mayoreo.`,
        stock: price > 0 ? 10 : 0,   // stock simulado
        seoTitle: generateSeoTitle(
          name,
          price,
          onSale && originalPrice > price,
          originalPrice
        ),
        category: detectCategory(name),
        hits: hits || undefined,
      };
    })
    .filter((p) => p.name && p.price >= 0);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(productos, null, 2), "utf-8");

  console.log(`✅ Importados ${productos.length} productos → ${OUT_PATH}`);
  console.log(`   Con oferta: ${productos.filter((p) => p.onSale).length}`);
  console.log(`   Con imagen: ${productos.filter((p) => p.image).length}`);
}

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("wax") || n.includes("pluma") || n.includes("1gr") || n.includes("2gr")) return "wax-pens";
  if (n.includes("pack")) return "packs";
  if (n.includes("hits")) return "disposables";
  return "otros";
}

main();

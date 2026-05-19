#!/usr/bin/env node
/**
 * WAXAPP — Scraper de productos con Cheerio (multi-proveedor)
 *
 * Uso:
 *   node scripts/scrape-products.js --url https://evapemayoreo.com/products
 *   node scripts/scrape-products.js --url https://evapemayoreo.com --save
 *   node scripts/scrape-products.js --url https://mitienda.com --provider puppeteer --save
 *
 * Flags:
 *   --url       URL a scrapear (obligatorio)
 *   --save      Insertar los productos en Supabase (is_active=false → borradores)
 *   --provider  fetch (default) | puppeteer
 *   --limit     Máximo de productos a extraer (default: 200)
 */

import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Cargar .env ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
try {
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* ignore */ }

// ─── Args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const targetUrl = getArg('--url');
const shouldSave = hasFlag('--save');
const provider = getArg('--provider') || 'fetch';
const limit = parseInt(getArg('--limit') || '200', 10);

if (!targetUrl) {
  console.error('❌ Uso: node scripts/scrape-products.js --url <URL> [--save] [--provider fetch|puppeteer]');
  process.exit(1);
}

// ─── Slugify ──────────────────────────────────────────────────────────
const slugify = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 80) + '-' + Math.random().toString(36).slice(2, 5);

// ─── Fetch HTML ───────────────────────────────────────────────────────
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`);
  return res.text();
}

// ─── Adaptadores por sitio ────────────────────────────────────────────

/** Extrae producto de un JSON-LD si existe */
function extractJsonLd($) {
  const products = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item['@type'] === 'Product') {
          products.push({
            name: item.name,
            description: item.description,
            price: parseFloat(item.offers?.price ?? item.offers?.[0]?.price ?? 0) || null,
            sku: item.sku || item.mpn || null,
            image_url: Array.isArray(item.image) ? item.image[0] : item.image || null,
            category: item.category || null,
          });
        }
      }
    } catch { /* invalid JSON-LD */ }
  });
  return products;
}

/** Adapter genérico: OG tags + meta + heurísticas */
function extractGeneric($, url) {
  // Try JSON-LD first
  const ldProducts = extractJsonLd($);
  if (ldProducts.length > 0) return ldProducts;

  // OG / meta fallback
  const ogTitle = $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;
  const ogDesc = $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') || null;

  // Price heuristic
  let price = null;
  $('[class*="price"],[id*="price"],[itemprop="price"]').each((_, el) => {
    if (price !== null) return;
    const raw = $(el).text().replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (num > 0) price = num;
  });

  if (!ogTitle) return [];
  return [{ name: ogTitle, description: ogDesc, price, image_url: ogImage, sku: null, category: null }];
}

/** Adapter específico para evapemayoreo.com */
function extractEvapemayoreo($) {
  const products = [];

  // Product grid cards
  $('[class*="product"],[class*="card"],[class*="item"]').each((_, el) => {
    const $el = $(el);

    // Skip navigation items
    if ($el.parents('nav, header, footer').length) return;

    const name = $el.find('[class*="title"],[class*="name"],h2,h3').first().text().trim();
    if (!name || name.length < 3) return;

    const priceText = $el.find('[class*="price"],[class*="precio"]').first().text()
      .replace(/[^\d.,]/g, '').replace(',', '.');
    const price = parseFloat(priceText) || null;

    const image = $el.find('img').first().attr('src') ||
      $el.find('img').first().attr('data-src') || null;

    const sku = $el.find('[class*="sku"],[class*="ref"]').first().text().trim() || null;

    products.push({ name, price, image_url: image, sku, description: null, category: null });
  });

  // Fallback to JSON-LD
  if (products.length === 0) return extractJsonLd($);
  return products;
}

/** Adapter para Shopify stores */
function extractShopify($, html) {
  // Shopify exposes window.ShopifyAnalytics or products in JSON
  const match = html.match(/var meta = ({[\s\S]*?});/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      if (meta?.product) {
        const p = meta.product;
        return [{
          name: p.title,
          description: p.description,
          price: p.price / 100,
          sku: p.variants?.[0]?.sku || null,
          image_url: p.featured_image,
          category: p.type || null,
        }];
      }
    } catch { /* ignore */ }
  }
  return extractGeneric($, '');
}

/** Detectar qué adapter usar y extraer productos */
function extractProducts($, html, url) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('evapemayoreo')) return extractEvapemayoreo($);
  if (hostname.includes('myshopify') || html.includes('Shopify.theme')) return extractShopify($, html);

  // Try JSON-LD (works for most structured stores)
  const ldProducts = extractJsonLd($);
  if (ldProducts.length > 0) return ldProducts;

  return extractGeneric($, url);
}

// ─── Descubrir URLs de productos en el sitio ──────────────────────────
async function discoverProductUrls(baseUrl, html) {
  const $ = load(html);
  const base = new URL(baseUrl);
  const urls = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (!abs.startsWith(base.origin)) return;
      // Heuristic: product URLs contain these patterns
      if (/\/(product|producto|p|item|productos|catalogo|shop)\//i.test(abs)) {
        urls.add(abs);
      }
    } catch { /* ignore */ }
  });

  return Array.from(urls).slice(0, limit);
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 WAXAPP Product Scraper`);
  console.log(`📡 URL: ${targetUrl}`);
  console.log(`💾 Guardar en Supabase: ${shouldSave ? 'SÍ' : 'NO (solo preview)'}`);
  console.log(`🔧 Provider: ${provider}\n`);

  // 1. Fetch the main page
  console.log('⏳ Descargando página principal...');
  const mainHtml = await fetchHtml(targetUrl);
  const $ = load(mainHtml);

  // 2. Try to extract products from the main page first
  let products = extractProducts($, mainHtml, targetUrl);
  console.log(`   → ${products.length} productos encontrados en la página principal`);

  // 3. If few products, discover and scrape sub-pages
  if (products.length < 5) {
    console.log('⏳ Descubriendo URLs de productos...');
    const productUrls = await discoverProductUrls(targetUrl, mainHtml);
    console.log(`   → ${productUrls.length} URLs de productos encontradas`);

    for (const [i, url] of productUrls.slice(0, limit).entries()) {
      process.stdout.write(`   [${i + 1}/${productUrls.length}] ${url.slice(0, 80)}... `);
      try {
        const html = await fetchHtml(url);
        const $page = load(html);
        const pageProducts = extractProducts($page, html, url);
        if (pageProducts.length > 0) {
          products.push(...pageProducts);
          console.log(`✅ ${pageProducts.length} producto(s)`);
        } else {
          console.log('⚠ sin datos');
        }
        // Small delay to be polite
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.log(`❌ ${e.message}`);
      }
    }
  }

  // 4. Deduplicate by name
  const seen = new Set();
  products = products.filter((p) => {
    if (!p.name || seen.has(p.name.toLowerCase())) return false;
    seen.add(p.name.toLowerCase());
    return true;
  }).slice(0, limit);

  console.log(`\n📦 Total de productos únicos: ${products.length}`);

  // 5. Preview
  console.log('\n── Vista previa (primeros 5) ─────────────────────────');
  products.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    if (p.price) console.log(`   💰 $${p.price}`);
    if (p.sku) console.log(`   🏷 SKU: ${p.sku}`);
    if (p.image_url) console.log(`   🖼 ${p.image_url.slice(0, 60)}...`);
  });

  // 6. Save to Supabase
  if (!shouldSave) {
    console.log('\n💡 Agrega --save para insertar en Supabase como borradores.');
    console.log('   node scripts/scrape-products.js --url ' + targetUrl + ' --save');
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('\n❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos en .env para --save');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('\n⏳ Insertando en Supabase como borradores (is_active=false)...');

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of products) {
    try {
      const row = {
        name: p.name.slice(0, 200),
        description: p.description ? String(p.description).slice(0, 2000) : null,
        price: p.price ?? 0,
        sku: p.sku ? String(p.sku).slice(0, 60) : null,
        image_url: p.image_url || null,
        category: p.category || null,
        stock: 0,
        is_active: false,
        slug: slugify(p.name),
      };

      // Skip if name already exists
      const { data: existing } = await supabase
        .from('products').select('id').eq('name', row.name).maybeSingle();
      if (existing) { skipped++; continue; }

      const { error } = await supabase.from('products').insert(row);
      if (error) { console.error(`  ❌ ${p.name}: ${error.message}`); errors++; }
      else inserted++;
    } catch (e) {
      errors++; console.error(`  ❌ ${p.name}: ${e.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`✅ Insertados como borradores: ${inserted}`);
  if (skipped) console.log(`⚠  Ya existían (omitidos): ${skipped}`);
  if (errors)  console.log(`❌ Errores: ${errors}`);
  console.log('\n💡 Revísalos en Admin → Previsualizar Importados → "✨ Llenar con IA"');
}

main().catch((e) => { console.error('\n❌ Error fatal:', e.message); process.exit(1); });

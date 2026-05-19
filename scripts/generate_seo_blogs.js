#!/usr/bin/env node
/**
 * WAXAPP — Generador masivo de blogs SEO con Google Gemini
 * Uso: node scripts/generate_seo_blogs.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Cargar .env manualmente (ESM no tiene require) ──────────────────
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
} catch {
  console.warn('No se pudo leer .env, usando variables de entorno del sistema.');
}

// ─── Validar variables ────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_KEY) { console.error('❌ GEMINI_API_KEY no configurada.'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ SUPABASE_URL no configurada.'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY no configurada.'); process.exit(1); }

// ─── Inicializar clientes ─────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── 50 temas ─────────────────────────────────────────────────────────
const TOPICS = [
  { title: 'Beneficios del CBD para el dolor crónico', category: 'cbd', keywords: 'CBD dolor crónico México' },
  { title: 'CBD y ansiedad: ¿realmente funciona?', category: 'cbd', keywords: 'CBD ansiedad bienestar' },
  { title: 'Diferencia entre CBD y THC: guía completa', category: 'cbd', keywords: 'CBD THC diferencias cannabis' },
  { title: 'CBD para dormir mejor: dosis y horarios recomendados', category: 'cbd', keywords: 'CBD sueño melatonina' },
  { title: 'CBD Nano-emulsionado: máxima biodisponibilidad', category: 'nano', keywords: 'nano CBD emulsión absorción' },
  { title: 'Aceite de CBD: cómo elegir la concentración correcta', category: 'cbd', keywords: 'aceite CBD concentración mg' },
  { title: 'CBD y antiinflamatorio natural: alternativa a los NSAIDs', category: 'cbd', keywords: 'CBD antiinflamatorio natural' },
  { title: '¿Es legal el CBD en México? Todo lo que debes saber', category: 'guias', keywords: 'CBD legal México 2024' },
  { title: 'Vapes de THC: ventajas sobre el consumo tradicional', category: 'thc', keywords: 'vapes THC ventajas' },
  { title: 'THC y creatividad: lo que dice la ciencia', category: 'thc', keywords: 'THC creatividad ciencia' },
  { title: 'Plumas de THC: guía de uso para principiantes', category: 'thc', keywords: 'plumas THC principiantes guía' },
  { title: 'Microdosing de THC: beneficios y cómo hacerlo', category: 'thc', keywords: 'microdosing THC dosis pequeñas' },
  { title: 'THC y náuseas: usos medicinales en oncología', category: 'thc', keywords: 'THC náuseas medicinal' },
  { title: 'Cartuchos de THC: indica vs sativa vs híbrido', category: 'thc', keywords: 'THC indica sativa híbrido' },
  { title: 'THC Full Spectrum: los beneficios del efecto séquito', category: 'thc', keywords: 'THC full spectrum terpenos' },
  { title: 'Cómo usar un vape correctamente: guía paso a paso', category: 'vapes', keywords: 'usar vape correctamente' },
  { title: 'Vapes desechables vs recargables: ¿cuál elegir?', category: 'vapes', keywords: 'vapes desechables recargables comparativa' },
  { title: 'Temperaturas de vapeo: cómo afectan al sabor y efecto', category: 'vapes', keywords: 'temperatura vapeo CBD THC' },
  { title: 'Los mejores vapes del mercado mexicano 2024', category: 'vapes', keywords: 'mejores vapes México 2024' },
  { title: 'Mantenimiento de tu vape: cómo limpiarlo correctamente', category: 'vapes', keywords: 'limpiar mantenimiento vape' },
  { title: 'Terpenos en los vapes: sabores y efectos', category: 'vapes', keywords: 'terpenos vape sabores efectos' },
  { title: 'Gomitas de CBD: dosis recomendadas y efectos', category: 'edibles', keywords: 'gomitas CBD dosis efectos' },
  { title: 'Edibles de THC: por qué tardan más en hacer efecto', category: 'edibles', keywords: 'edibles THC absorción tiempo efecto' },
  { title: 'Chocolates con CBD: la forma más deliciosa de consumir', category: 'edibles', keywords: 'chocolate CBD edibles' },
  { title: 'Bebidas con cannabinoides: la tendencia de 2024', category: 'edibles', keywords: 'bebidas CBD THC tendencia' },
  { title: 'Resina de cannabis: tipos y cómo usarla', category: 'general', keywords: 'resina cannabis tipos uso' },
  { title: 'Hash vs concentrado: diferencias y efectos', category: 'general', keywords: 'hash concentrado diferencias' },
  { title: 'Extractos de cannabis: CO2 vs BHO vs destilado', category: 'general', keywords: 'extractos CO2 BHO destilado' },
  { title: 'Cannabis y deporte: recuperación muscular con CBD', category: 'cbd', keywords: 'CBD deporte recuperación músculos' },
  { title: 'CBD para mascotas: beneficios y precauciones', category: 'cbd', keywords: 'CBD mascotas perros gatos' },
  { title: 'Cannabis y meditación: potenciar el mindfulness', category: 'general', keywords: 'cannabis meditación mindfulness bienestar' },
  { title: 'CBD y piel: beneficios en cosmética y skincare', category: 'cbd', keywords: 'CBD piel cosmética skincare' },
  { title: 'Sistema endocannabinoide: cómo funciona en tu cuerpo', category: 'guias', keywords: 'sistema endocannabinoide cuerpo humano' },
  { title: 'CBD y migraña: evidencia científica actual', category: 'cbd', keywords: 'CBD migraña evidencia científica' },
  { title: 'THC y PTSD: estudios clínicos y resultados', category: 'thc', keywords: 'THC PTSD estrés postraumático' },
  { title: 'Nanotecnología en cannabis: la revolución del bienestar', category: 'nano', keywords: 'nanotecnología cannabis biodisponibilidad' },
  { title: 'CBD nano vs CBD convencional: comparativa completa', category: 'nano', keywords: 'CBD nano convencional comparativa' },
  { title: 'Cómo la nano-emulsión aumenta la absorción del CBD', category: 'nano', keywords: 'nano emulsión absorción biodisponibilidad CBD' },
  { title: 'Primeros pasos con el cannabis: guía para principiantes', category: 'guias', keywords: 'cannabis principiantes primera vez guía' },
  { title: 'Cómo leer una etiqueta de producto de cannabis', category: 'guias', keywords: 'etiqueta cannabis COA certificado análisis' },
  { title: 'Conservar tus productos de cannabis correctamente', category: 'guias', keywords: 'conservar cannabis almacenar correctamente' },
  { title: 'Preguntas frecuentes sobre CBD y THC en México', category: 'guias', keywords: 'preguntas frecuentes CBD THC México FAQ' },
  { title: 'Cómo calcular tu dosis ideal de CBD', category: 'guias', keywords: 'calcular dosis CBD mg peso corporal' },
  { title: 'Las mejores marcas de CBD en México 2024', category: 'general', keywords: 'mejores marcas CBD México 2024' },
  { title: 'Tendencias del mercado cannábico en México', category: 'general', keywords: 'tendencias mercado cannabis México 2024' },
  { title: 'Cómo diferenciar un CBD de calidad de uno adulterado', category: 'guias', keywords: 'CBD calidad adulterado diferencia COA' },
  { title: 'Full Spectrum vs Broad Spectrum vs Isolate: diferencias', category: 'guias', keywords: 'full spectrum broad spectrum isolate CBD' },
  { title: 'Certificados de análisis (COA): qué son y por qué importan', category: 'guias', keywords: 'COA certificado análisis cannabis laboratorio' },
  { title: 'Cannabis y ansiedad social: testimonios y evidencia', category: 'cbd', keywords: 'cannabis ansiedad social testimonios' },
  { title: 'WAXAPP: productos bio-tech de bienestar premium en México', category: 'general', keywords: 'WAXAPP productos bienestar México bio-tech' },
];

// ─── Helpers ──────────────────────────────────────────────────────────
const slugify = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateBlog(topic) {
  const contentPrompt = `Eres un experto en content marketing de cannabis y bienestar en México. Escribe un artículo de blog profesional y optimizado para SEO sobre: "${topic.title}".

INSTRUCCIONES:
- Escribe en español mexicano natural y persuasivo
- 600-900 palabras
- Estructura HTML: <h2> secciones principales, <h3> subsecciones, <p> párrafos, <ul><li> listas
- Incluye emojis estratégicamente
- Menciona naturalmente la marca WAXAPP
- Keyword principal: "${topic.keywords}"
- NO incluyas el H1 — empieza con <p> o <h2>
- Devuelve SOLO el HTML, sin bloques de código markdown`;

  const metaPrompt = `Meta descripción SEO de máximo 155 caracteres para el artículo "${topic.title}". Incluye la keyword "${topic.keywords}". Solo el texto, sin comillas.`;

  const [contentRes, metaRes] = await Promise.all([
    model.generateContent(contentPrompt),
    model.generateContent(metaPrompt),
  ]);

  const content = contentRes.response.text().trim().replace(/^```html?\n?/, '').replace(/\n?```$/, '');
  const metaDescription = metaRes.response.text().trim().slice(0, 155);
  const slug = slugify(topic.title);
  const imageKeyword = encodeURIComponent(topic.keywords.split(' ').slice(0, 2).join(' '));

  return {
    slug,
    title: topic.title,
    excerpt: metaDescription,
    content,
    cover_image_url: `https://source.unsplash.com/800x500/?${imageKeyword}`,
    author: 'WAXAPP Editorial',
    category: topic.category,
    meta_title: `${topic.title} | WAXAPP`,
    meta_description: metaDescription,
    keywords: topic.keywords.split(' '),
    status: 'published',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 WAXAPP — Generador de Blogs SEO con Gemini');
  console.log(`📝 Generando ${TOPICS.length} artículos...\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i];
    process.stdout.write(`⏳ [${i + 1}/${TOPICS.length}] ${topic.title}... `);

    try {
      const blog = await generateBlog(topic);

      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', blog.slug)
        .maybeSingle();

      if (existing) {
        console.log('⚠ ya existe, omitido');
        skipped++;
      } else {
        const { error } = await supabase.from('blog_posts').insert(blog);
        if (error) {
          console.log(`❌ ${error.message}`);
          errors++;
        } else {
          console.log('✅');
          success++;
        }
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors++;
    }

    if (i < TOPICS.length - 1) await sleep(1200);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`✅ Insertados:  ${success}`);
  if (skipped) console.log(`⚠  Omitidos:   ${skipped} (ya existían)`);
  if (errors)  console.log(`❌ Errores:    ${errors}`);
  console.log('🎉 ¡Revísalos en Admin → Blog!');
}

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });

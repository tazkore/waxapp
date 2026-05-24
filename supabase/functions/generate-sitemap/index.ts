// generate-sitemap: dynamic XML sitemap with SEO pages, products and blog posts.
// Multi-domain aware: resolves base URL from ?host= query or x-forwarded-host header,
// and emits xhtml:link rel="alternate" hreflang for each sister domain.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Mirror of src/config/siteConfig.ts (kept minimal â€” only what the sitemap needs).
type SiteAlt = { hostname: string; canonicalBase: string; hreflang: string };
const SITES: SiteAlt[] = [
  { hostname: 'waxapp.mx', canonicalBase: 'https://waxapp.mx', hreflang: 'es-MX' },
  { hostname: 'vapewax.com.mx', canonicalBase: 'https://vapewax.com.mx', hreflang: 'es-MX' },
  { hostname: 'extraccionwax.com', canonicalBase: 'https://extraccionwax.com', hreflang: 'es-MX' },
]
const DEFAULT_BASE = Deno.env.get('SITE_URL') || 'https://waxapp.mx'

const resolveBase = (req: Request): string => {
  const url = new URL(req.url)
  const hostParam = url.searchParams.get('host')
  const headerHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const candidate = (hostParam || headerHost).toLowerCase().replace(/^www\./, '')
  const match = SITES.find((s) => s.hostname === candidate)
  return match?.canonicalBase || DEFAULT_BASE
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const altLinks = (path: string) =>
  SITES.map(
    (s) =>
      `\n    <xhtml:link rel="alternate" hreflang="${s.hreflang}" href="${escapeXml(s.canonicalBase + path)}"/>`,
  ).join('') +
  `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(DEFAULT_BASE + path)}"/>`

const urlNode = (
  base: string,
  path: string,
  lastmod: string,
  changefreq = 'weekly',
  priority = '0.7',
) => `
  <url>
    <loc>${escapeXml(base + path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${altLinks(path)}
  </url>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SITE_URL = resolveBase(req)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const today = new Date().toISOString().split('T')[0]

    const { data: pages } = await supabase
      .from('seo_pages')
      .select('page_path, updated_at, is_indexed, auto_sitemap')
      .eq('is_indexed', true)
      .eq('auto_sitemap', true)

    const pageNodes = (pages ?? [])
      .map((p: any) =>
        urlNode(SITE_URL, p.page_path, new Date(p.updated_at).toISOString().split('T')[0], 'weekly', '0.8'),
      )
      .join('')

    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at, noindex, is_active')
      .eq('is_active', true)
      .eq('noindex', false)
      .not('slug', 'is', null)
      .limit(5000)

    const productNodes = (products ?? [])
      .map((p: any) =>
        urlNode(
          SITE_URL,
          `/producto/${p.slug}`,
          new Date(p.updated_at).toISOString().split('T')[0],
          'weekly',
          '0.9',
        ),
      )
      .join('')

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, status')
      .eq('status', 'published')
      .limit(2000)

    const blogNodes = (posts ?? [])
      .map((b: any) =>
        urlNode(
          SITE_URL,
          `/blog/${b.slug}`,
          new Date(b.updated_at).toISOString().split('T')[0],
          'monthly',
          '0.6',
        ),
      )
      .join('')

    const staticCats = ['/cbd', '/edibles', '/laboratorios', '/marcas', '/neshika', '/blog']
      .map((p) => urlNode(SITE_URL, p, today, 'weekly', '0.7'))
      .join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urlNode(SITE_URL, '/', today, 'daily', '1.0')}${staticCats}${pageNodes}${productNodes}${blogNodes}
</urlset>`

    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})


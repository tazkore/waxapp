// generate-sitemap: dynamic XML sitemap with SEO pages, products and blog posts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') || 'https://waxapp.mx'

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const urlNode = (path: string, lastmod: string, changefreq = 'weekly', priority = '0.7') => `
  <url>
    <loc>${escapeXml(SITE_URL + path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const today = new Date().toISOString().split('T')[0]

    // 1. Static / SEO pages
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('page_path, updated_at, is_indexed, auto_sitemap')
      .eq('is_indexed', true)
      .eq('auto_sitemap', true)

    const pageNodes = (pages ?? [])
      .map((p: any) =>
        urlNode(p.page_path, new Date(p.updated_at).toISOString().split('T')[0], 'weekly', '0.8'),
      )
      .join('')

    // 2. Products (active + not noindex)
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
          `/producto/${p.slug}`,
          new Date(p.updated_at).toISOString().split('T')[0],
          'weekly',
          '0.9',
        ),
      )
      .join('')

    // 3. Blog
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, status')
      .eq('status', 'published')
      .limit(2000)

    const blogNodes = (posts ?? [])
      .map((b: any) =>
        urlNode(
          `/blog/${b.slug}`,
          new Date(b.updated_at).toISOString().split('T')[0],
          'monthly',
          '0.6',
        ),
      )
      .join('')

    // 4. Static category pages (always present)
    const staticCats = ['/cbd', '/edibles', '/laboratorios', '/marcas', '/neshika', '/blog'].map(
      (p) => urlNode(p, today, 'weekly', '0.7'),
    ).join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlNode('/', today, 'daily', '1.0')}${staticCats}${pageNodes}${productNodes}${blogNodes}
</urlset>`

    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

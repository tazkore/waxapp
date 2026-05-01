
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS schema_type text NOT NULL DEFAULT 'Product',
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS mpn text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS long_description_html text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nofollow boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_focus_keyword ON public.products(focus_keyword) WHERE focus_keyword IS NOT NULL;

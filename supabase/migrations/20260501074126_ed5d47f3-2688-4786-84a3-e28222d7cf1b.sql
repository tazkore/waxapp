-- Producto: campos avanzados de metadatos
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ingredients text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS flavor_profile text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS battery_mah integer,
  ADD COLUMN IF NOT EXISTS puffs_estimate integer,
  ADD COLUMN IF NOT EXISTS nicotine_mg numeric,
  ADD COLUMN IF NOT EXISTS vaporizer_type text,
  ADD COLUMN IF NOT EXISTS thc_percentage numeric,
  ADD COLUMN IF NOT EXISTS cbd_percentage numeric,
  ADD COLUMN IF NOT EXISTS strain_type text,
  ADD COLUMN IF NOT EXISTS terpenes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS capacity_ml numeric,
  ADD COLUMN IF NOT EXISTS pg_vg_ratio text,
  ADD COLUMN IF NOT EXISTS compatibility text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS metadata_template text;

CREATE INDEX IF NOT EXISTS idx_products_specifications_gin ON public.products USING gin (specifications);
CREATE INDEX IF NOT EXISTS idx_products_warnings_gin ON public.products USING gin (warnings);
CREATE INDEX IF NOT EXISTS idx_products_flavor_profile_gin ON public.products USING gin (flavor_profile);
CREATE INDEX IF NOT EXISTS idx_products_metadata_template ON public.products (metadata_template) WHERE metadata_template IS NOT NULL;

-- Variantes: metadatos avanzados
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS compare_at_price numeric,
  ADD COLUMN IF NOT EXISTS flavor text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS size_label text,
  ADD COLUMN IF NOT EXISTS nicotine_mg numeric,
  ADD COLUMN IF NOT EXISTS capacity_ml numeric,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_product_variants_attributes_gin ON public.product_variants USING gin (attributes);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants (barcode) WHERE barcode IS NOT NULL;
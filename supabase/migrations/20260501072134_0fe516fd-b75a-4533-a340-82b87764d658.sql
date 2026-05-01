ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_attributes_gin
  ON public.products USING GIN (attributes);
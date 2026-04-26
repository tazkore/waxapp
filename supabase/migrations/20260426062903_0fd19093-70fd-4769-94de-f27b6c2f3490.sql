ALTER TABLE public.seo_redirects
  ADD COLUMN IF NOT EXISTS is_wildcard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_seo_redirects_wildcard_active
  ON public.seo_redirects (is_wildcard, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_seo_redirects_from_path_active
  ON public.seo_redirects (from_path)
  WHERE is_active = true;
-- 1. Add onboarding flag
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Create import_jobs table
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|mapping|scraping|importing|completed|failed
  urls_found integer NOT NULL DEFAULT 0,
  products_extracted integer NOT NULL DEFAULT 0,
  products_imported integer NOT NULL DEFAULT 0,
  branding jsonb,
  discovered_urls jsonb,
  extracted_products jsonb,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manage import_jobs"
ON public.import_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
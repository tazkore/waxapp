-- Tabla de redirects SEO
CREATE TABLE public.seo_redirects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_redirects_from_path ON public.seo_redirects(from_path) WHERE is_active = true;

ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active redirects"
ON public.seo_redirects FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "Auth can view active redirects"
ON public.seo_redirects FOR SELECT TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin can insert redirects"
ON public.seo_redirects FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update redirects"
ON public.seo_redirects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete redirects"
ON public.seo_redirects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon/auth to increment hit counters (for analytics)
CREATE POLICY "Anyone can update hit counters"
ON public.seo_redirects FOR UPDATE TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);

CREATE TRIGGER update_seo_redirects_updated_at
BEFORE UPDATE ON public.seo_redirects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: cuando cambia el slug de una página SEO, crear redirect 301 automático
CREATE OR REPLACE FUNCTION public.auto_create_seo_redirect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.page_path IS DISTINCT FROM NEW.page_path THEN
    -- Evitar redirects circulares
    IF NEW.page_path <> OLD.page_path THEN
      INSERT INTO public.seo_redirects (from_path, to_path, status_code, is_active, reason)
      VALUES (OLD.page_path, NEW.page_path, 301, true, 'Auto: slug renombrado en SEO admin')
      ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            is_active = true,
            status_code = 301,
            reason = EXCLUDED.reason,
            updated_at = now();
      
      -- Si existía un redirect que apuntaba a la ruta antigua, actualizarlo a la nueva (cadena → directo)
      UPDATE public.seo_redirects
      SET to_path = NEW.page_path, updated_at = now()
      WHERE to_path = OLD.page_path AND from_path <> NEW.page_path;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seo_pages_auto_redirect
AFTER UPDATE ON public.seo_pages
FOR EACH ROW EXECUTE FUNCTION public.auto_create_seo_redirect();
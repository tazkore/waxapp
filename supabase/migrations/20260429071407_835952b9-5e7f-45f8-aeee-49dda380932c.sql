-- Versioning system for sub-stores Remix
CREATE TABLE IF NOT EXISTS public.sub_store_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_store_id uuid NOT NULL REFERENCES public.sub_stores(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'manual_edit',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sub_store_id, version_number)
);

ALTER TABLE public.sub_store_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin/admin manage sub_store_versions"
ON public.sub_store_versions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_sub_store_versions_store ON public.sub_store_versions(sub_store_id, version_number DESC);

-- Add draft + version pointers to sub_stores
ALTER TABLE public.sub_stores
  ADD COLUMN IF NOT EXISTS draft_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS published_version_id uuid REFERENCES public.sub_store_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_version_id uuid REFERENCES public.sub_store_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_html_excerpt text;

-- Function: when a version is published, sync its snapshot to flat columns of sub_stores
CREATE OR REPLACE FUNCTION public.sync_published_version_to_sub_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s jsonb;
BEGIN
  IF NEW.is_published = true THEN
    s := NEW.snapshot;
    -- Mark previously published versions as not published for this store
    UPDATE public.sub_store_versions
      SET is_published = false
      WHERE sub_store_id = NEW.sub_store_id AND id <> NEW.id AND is_published = true;

    UPDATE public.sub_stores SET
      tagline = COALESCE(s->>'tagline', tagline),
      description = COALESCE(s->>'description', description),
      logo_url = COALESCE(s->>'logo_url', logo_url),
      favicon_url = COALESCE(s->>'favicon_url', favicon_url),
      og_image_url = COALESCE(s->>'og_image_url', og_image_url),
      hero_headline = COALESCE(s->>'hero_headline', hero_headline),
      hero_subtitle = COALESCE(s->>'hero_subtitle', hero_subtitle),
      hero_image_url = COALESCE(s->>'hero_image_url', hero_image_url),
      color_primary = COALESCE(s->>'color_primary', color_primary),
      color_secondary = COALESCE(s->>'color_secondary', color_secondary),
      color_background = COALESCE(s->>'color_background', color_background),
      color_foreground = COALESCE(s->>'color_foreground', color_foreground),
      color_accent = COALESCE(s->>'color_accent', color_accent),
      font_heading = COALESCE(s->>'font_heading', font_heading),
      font_body = COALESCE(s->>'font_body', font_body),
      published_version_id = NEW.id,
      updated_at = now()
    WHERE id = NEW.sub_store_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_published_version ON public.sub_store_versions;
CREATE TRIGGER trg_sync_published_version
AFTER INSERT OR UPDATE OF is_published ON public.sub_store_versions
FOR EACH ROW EXECUTE FUNCTION public.sync_published_version_to_sub_store();
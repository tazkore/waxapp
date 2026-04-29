CREATE TABLE IF NOT EXISTS public.sub_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  tagline text,
  logo_url text,
  favicon_url text,
  og_image_url text,
  hero_headline text,
  hero_subtitle text,
  hero_image_url text,
  color_primary text,
  color_secondary text,
  color_background text,
  color_foreground text,
  color_accent text,
  font_heading text,
  font_body text,
  source_template text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin/admin manage sub_stores"
ON public.sub_stores FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public view active sub_stores"
ON public.sub_stores FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE TRIGGER update_sub_stores_updated_at
BEFORE UPDATE ON public.sub_stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_store_id uuid REFERENCES public.sub_stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_sub_store ON public.products(sub_store_id);
CREATE INDEX IF NOT EXISTS idx_sub_stores_brand ON public.sub_stores(brand_id);
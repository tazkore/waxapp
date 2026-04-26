-- THEME SETTINGS (singleton row con identidad visual del sitio)
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'WAXAPP',
  tagline text,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  og_image_url text,
  -- Colores en HSL (string tipo "145 100% 45%")
  color_primary text NOT NULL DEFAULT '145 100% 45%',
  color_secondary text NOT NULL DEFAULT '40 100% 50%',
  color_background text NOT NULL DEFAULT '0 0% 4%',
  color_foreground text NOT NULL DEFAULT '240 5% 96%',
  color_accent text NOT NULL DEFAULT '0 0% 15%',
  -- Tipografía
  font_heading text NOT NULL DEFAULT 'Space Grotesk',
  font_body text NOT NULL DEFAULT 'Inter',
  -- Otros
  custom_css text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active theme" ON public.theme_settings
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth can view active theme" ON public.theme_settings
  FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Admin insert theme" ON public.theme_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin update theme" ON public.theme_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin delete theme" ON public.theme_settings
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_theme_settings_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial
INSERT INTO public.theme_settings (site_name, tagline)
VALUES ('WAXAPP', 'Bio-tech mexicana')
ON CONFLICT DO NOTHING;

-- ======================================================================
-- NAV MENUS (Navbar, Footer, etc) con items drag & drop
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.nav_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL DEFAULT 'navbar',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nav_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.nav_menus(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.nav_menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  icon text,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_menu_items_menu ON public.nav_menu_items(menu_id, display_order);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_parent ON public.nav_menu_items(parent_id);

ALTER TABLE public.nav_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nav_menus" ON public.nav_menus FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth read nav_menus" ON public.nav_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write nav_menus" ON public.nav_menus FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Public read nav_menu_items" ON public.nav_menu_items FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth read nav_menu_items" ON public.nav_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write nav_menu_items" ON public.nav_menu_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_nav_menus_updated BEFORE UPDATE ON public.nav_menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nav_menu_items_updated BEFORE UPDATE ON public.nav_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: Navbar y Footer con los enlaces actuales
INSERT INTO public.nav_menus (slug, name, location) VALUES
  ('main-navbar', 'Menú Principal', 'navbar'),
  ('main-footer', 'Menú Footer', 'footer')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.nav_menu_items (menu_id, label, url, display_order)
SELECT m.id, x.label, x.url, x.ord FROM public.nav_menus m
CROSS JOIN (VALUES
  ('Tienda','/#tienda',1),
  ('CBD','/cbd',2),
  ('Edibles','/edibles',3),
  ('Marcas','/marcas',4),
  ('Blog','/blog',5),
  ('FAQ','/#faq',6)
) AS x(label,url,ord)
WHERE m.slug = 'main-navbar'
AND NOT EXISTS (SELECT 1 FROM public.nav_menu_items WHERE menu_id = m.id);

-- ======================================================================
-- CUSTOM PAGES (páginas creadas desde admin, base para el page builder)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.custom_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  meta_title text,
  meta_description text,
  og_image_url text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_in_navbar boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published pages" ON public.custom_pages FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Auth read published pages" ON public.custom_pages FOR SELECT TO authenticated
  USING (status = 'published' OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Admin write pages" ON public.custom_pages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

CREATE TRIGGER trg_custom_pages_updated BEFORE UPDATE ON public.custom_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  website text,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active brands" ON public.brands
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated can view active brands" ON public.brands
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin can view all brands" ON public.brands
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert brands" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update brands" ON public.brands
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete brands" ON public.brands
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL,
  title text,
  subtitle text,
  cta_text text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated can view active banners" ON public.banners
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin can view all banners" ON public.banners
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert banners" ON public.banners
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update banners" ON public.banners
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete banners" ON public.banners
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS: brand_id (no FK so we don't fight existing constraints, soft link)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid;

-- PRODUCT VARIANTS: image_url
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url text;

-- NEW INTEGRATIONS (App Store)
INSERT INTO public.integrations (name, slug, description, category, is_installed, is_active, config, api_docs_url, version) VALUES
  ('Mailchimp', 'mailchimp', 'Email marketing y automatización de campañas', 'email', false, false, '{}'::jsonb, 'https://mailchimp.com/developer/marketing/api/', '1.0.0'),
  ('Meta Pixel', 'meta-pixel', 'Tracking de conversiones para Facebook & Instagram Ads', 'analytics', false, false, '{}'::jsonb, 'https://developers.facebook.com/docs/meta-pixel', '1.0.0'),
  ('Google Analytics 4', 'ga4', 'Análisis web y comercio electrónico avanzado', 'analytics', false, false, '{}'::jsonb, 'https://developers.google.com/analytics/devguides/collection/ga4', '1.0.0'),
  ('TikTok Pixel', 'tiktok-pixel', 'Tracking y optimización para TikTok Ads', 'analytics', false, false, '{}'::jsonb, 'https://business-api.tiktok.com/portal/docs', '1.0.0'),
  ('WhatsApp Business', 'whatsapp-business', 'Mensajería y notificaciones a clientes vía WhatsApp Cloud API', 'messaging', false, false, '{}'::jsonb, 'https://developers.facebook.com/docs/whatsapp', '1.0.0'),
  ('Shopify Sync', 'shopify', 'Sincroniza catálogo e inventario con tu tienda Shopify', 'marketplace', false, false, '{}'::jsonb, 'https://shopify.dev/docs/api', '1.0.0'),
  ('Zapier', 'zapier', 'Automatizaciones con miles de apps vía webhooks', 'automation', false, false, '{}'::jsonb, 'https://zapier.com/developer', '1.0.0'),
  ('Slack', 'slack', 'Notificaciones de pedidos, stock bajo y leads en tu canal', 'messaging', false, false, '{}'::jsonb, 'https://api.slack.com/messaging/webhooks', '1.0.0'),
  ('Stripe', 'stripe', 'Procesador de pagos internacional alternativo a Clip', 'payments', false, false, '{}'::jsonb, 'https://stripe.com/docs/api', '1.0.0'),
  ('MercadoLibre', 'mercadolibre', 'Publica y sincroniza productos con MercadoLibre', 'marketplace', false, false, '{}'::jsonb, 'https://developers.mercadolibre.com.mx', '1.0.0')
ON CONFLICT (slug) DO NOTHING;
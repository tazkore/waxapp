
-- 1. site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Mod view email_templates" ON public.email_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. custom_fields
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','number','select','date','checkbox','textarea')),
  applies_to text NOT NULL CHECK (applies_to IN ('product','client','order')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, applies_to)
);
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage custom_fields" ON public.custom_fields
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Public read active custom_fields" ON public.custom_fields
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE TRIGGER trg_custom_fields_updated
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed e-mail templates
INSERT INTO public.email_templates (slug, name, subject, body_html, variables) VALUES
  ('welcome', 'Bienvenida', '¡Bienvenido a {{store_name}}!', '<h1>Hola {{customer_name}}</h1><p>Gracias por registrarte.</p>', '["customer_name","store_name"]'::jsonb),
  ('order_confirmed', 'Pedido confirmado', 'Tu pedido {{order_number}} fue recibido', '<h1>Gracias {{customer_name}}</h1><p>Tu pedido <strong>{{order_number}}</strong> por {{total}} está en proceso.</p>', '["customer_name","order_number","total"]'::jsonb),
  ('order_shipped', 'Pedido enviado', 'Tu pedido {{order_number}} va en camino', '<p>Hola {{customer_name}}, tu paquete fue enviado. Guía: {{tracking_number}}.</p>', '["customer_name","order_number","tracking_number"]'::jsonb),
  ('password_recovery', 'Recuperar contraseña', 'Restablece tu contraseña', '<p>Hola, haz clic <a href="{{reset_url}}">aquí</a> para restablecer.</p>', '["reset_url"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

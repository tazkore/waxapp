-- Seed shipping providers (5 carriers) if table is empty
INSERT INTO public.shipping_providers (name, slug, is_active, config)
SELECT name, slug, false, '{}'::jsonb
FROM (VALUES
  ('Skydropx', 'skydropx'),
  ('Envia.com', 'enviacom'),
  ('FedEx', 'fedex'),
  ('DHL', 'dhl'),
  ('99 Minutos', '99minutos')
) AS t(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_providers LIMIT 1);

-- Ensure config column has a default
ALTER TABLE public.shipping_providers
  ALTER COLUMN config SET DEFAULT '{}'::jsonb;

-- Drop any restrictive RLS policies on shipping_providers and recreate
DROP POLICY IF EXISTS "Admin manage shipping_providers" ON public.shipping_providers;
DROP POLICY IF EXISTS "Public read shipping_providers" ON public.shipping_providers;
DROP POLICY IF EXISTS "Allow admin full access" ON public.shipping_providers;

-- Admins (super_admin, admin, moderator) can do everything
CREATE POLICY "Admin manage shipping_providers"
  ON public.shipping_providers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Fix RLS on chatbot_kb — admins can manage
DROP POLICY IF EXISTS "Admin manage chatbot_kb" ON public.chatbot_kb;
DROP POLICY IF EXISTS "Allow admin full access" ON public.chatbot_kb;

CREATE POLICY "Admin manage chatbot_kb"
  ON public.chatbot_kb
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Allow anon/service role to read chatbot_kb (for the chatbot edge function)
DROP POLICY IF EXISTS "Anon read chatbot_kb" ON public.chatbot_kb;
CREATE POLICY "Anon read chatbot_kb"
  ON public.chatbot_kb
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Fix RLS on integrations — admins can manage
DROP POLICY IF EXISTS "Admin manage integrations" ON public.integrations;

CREATE POLICY "Admin manage integrations"
  ON public.integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Push Subscriptions — almacena tokens de notificación web (VAPID/Web Push)
-- vinculados a usuarios del CRM (customer_profiles) o autenticados (auth.users).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT,
  auth        TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- customer_profile opcional (se resuelve desde user_id o email)
  customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  user_agent  TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx  ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx   ON public.push_subscriptions(active);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions(endpoint);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede insertar/actualizar su propia suscripción
CREATE POLICY "push_sub_insert_own" ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "push_sub_update_own" ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Solo admin/super_admin puede leer todas
CREATE POLICY "push_sub_admin_read" ON public.push_subscriptions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Service Role puede hacer todo (Edge Functions)
CREATE POLICY "push_sub_service_role" ON public.push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Tabla de configuración VAPID (claves públicas/privadas para Web Push)
CREATE TABLE IF NOT EXISTS public.vapid_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key  TEXT NOT NULL,
  -- private_key se guarda en Supabase Vault, NO en esta tabla
  subject     TEXT NOT NULL DEFAULT 'mailto:admin@waxapp.mx',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vapid_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vapid_admin_only" ON public.vapid_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
    OR auth.role() = 'service_role'
  );

-- Permisos
GRANT INSERT, UPDATE, SELECT ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT SELECT ON public.vapid_config TO authenticated;
GRANT ALL ON public.vapid_config TO service_role;

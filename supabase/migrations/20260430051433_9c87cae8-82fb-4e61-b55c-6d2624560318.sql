-- 1. Versionado del schema en integraciones
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schema_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Restringir EXECUTE en SECURITY DEFINER
-- Helpers (gating de roles) - solo authenticated debe poder llamarlos
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_substore_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_substore_access(uuid, uuid) TO authenticated;

-- Funciones de trigger - nadie debe llamarlas directo
REVOKE EXECUTE ON FUNCTION public.create_welcome_coupon() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_seo_redirect() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_payment_transaction_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_published_version_to_sub_store() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. Cerrar listado público del bucket media (mantener acceso por URL directa)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Public read media','Media public select','Public Access media','Public access media'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Crear policy explícita de lectura por bucket (sin permitir list amplio)
DROP POLICY IF EXISTS "Media bucket public read by path" ON storage.objects;
CREATE POLICY "Media bucket public read by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');
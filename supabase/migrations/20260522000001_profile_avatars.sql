-- FASE 1: Ampliar customer_profiles con avatar y asegurar RLS correcta
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Reconstruir políticas RLS para customer_profiles
DROP POLICY IF EXISTS "admin_full_access" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admin/mod can view all customer profiles" ON public.customer_profiles;

CREATE POLICY "customer_read_own"
  ON public.customer_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "customer_insert_own"
  ON public.customer_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_update_own"
  ON public.customer_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_full_access"
  ON public.customer_profiles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
  );

-- FASE 2: Crear bucket 'avatars' para fotos de perfil (storage interno Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas de storage: usuarios autenticados pueden subir/actualizar su propia carpeta
DROP POLICY IF EXISTS "avatar_upload_own" ON storage.objects;
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;
CREATE POLICY "avatar_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- FASE 3: Asegurar que clients tiene la política correcta para lectura
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT TO authenticated USING (true);

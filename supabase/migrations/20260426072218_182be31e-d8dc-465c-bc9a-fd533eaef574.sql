-- Admin/mod pueden subir y leer comprobantes en el bucket privado
DO $$ BEGIN
  CREATE POLICY "Admin/mod upload payment-proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin/mod read payment-proofs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'payment-proofs'
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin delete payment-proofs"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'payment-proofs'
      AND public.has_role(auth.uid(), 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
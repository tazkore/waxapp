-- Reemplaza la política demasiado abierta de payment_proofs por una validada
DROP POLICY IF EXISTS "Public can upload proofs" ON public.payment_proofs;

CREATE POLICY "Public can upload proofs for pending transfers"
  ON public.payment_proofs
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payment_transactions t
      WHERE t.id = payment_proofs.transaction_id
        AND t.status = 'pending'
        AND t.gateway_slug = 'bank_transfer'
    )
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- Restringir subidas anónimas a una carpeta concreta
DROP POLICY IF EXISTS "Public upload payment proofs" ON storage.objects;

CREATE POLICY "Public upload payment proofs in submissions"
  ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = 'submissions'
  );
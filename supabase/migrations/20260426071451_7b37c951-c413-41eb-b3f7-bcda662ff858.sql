-- 1. Pasarelas de pago configurables
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'gateway', -- 'gateway' | 'manual'
  is_active boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  icon_url text,
  description text,
  instructions text, -- texto mostrado al cliente (ej. "Transfiere a esta cuenta...")
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  fees jsonb NOT NULL DEFAULT '{}'::jsonb, -- {percent: 3.6, fixed: 2.5}
  supports_refunds boolean NOT NULL DEFAULT false,
  requires_verification boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access payment_gateways" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth view active gateways" ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Public view active gateways" ON public.payment_gateways
  FOR SELECT TO anon
  USING (is_active = true);

CREATE TRIGGER payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Transacciones unificadas (todas las pasarelas)
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  gateway_slug text NOT NULL, -- snapshot por si se borra la pasarela
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  external_id text, -- id en Clip/Stripe/MP
  reference text, -- referencia bancaria / código de pedido
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MXN',
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending|authorized|paid|refunded|failed|disputed|cancelled
  method text, -- card|transfer|cash|oxxo|wallet
  customer_email text,
  customer_name text,
  paid_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  verified_by uuid, -- user_id admin que verificó (para transferencias)
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_gateway ON public.payment_transactions(gateway_slug);
CREATE INDEX idx_payment_transactions_order ON public.payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_paid_at ON public.payment_transactions(paid_at DESC);
CREATE UNIQUE INDEX idx_payment_transactions_external ON public.payment_transactions(gateway_slug, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod view transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin insert transactions" ON public.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin update transactions" ON public.payment_transactions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin delete transactions" ON public.payment_transactions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Comprobantes de pago (transferencias)
CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  uploaded_by_email text, -- email del cliente que subió
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_proofs_transaction ON public.payment_proofs(transaction_id);
CREATE INDEX idx_payment_proofs_status ON public.payment_proofs(status);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod view proofs" ON public.payment_proofs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Public can upload proofs" ON public.payment_proofs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin update proofs" ON public.payment_proofs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin delete proofs" ON public.payment_proofs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Configuración bancaria (cuentas para mostrar al cliente en transferencia)
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  account_number text,
  clabe text,
  swift text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public view active bank accounts" ON public.bank_accounts
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Bucket privado para comprobantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public upload payment proofs"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Admin/mod read payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Admin delete payment proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. Semilla de pasarelas iniciales
INSERT INTO public.payment_gateways (slug, name, type, is_active, display_order, description, supports_refunds, requires_verification, fees) VALUES
  ('clip', 'Clip', 'gateway', true, 1, 'Pagos con tarjeta vía Clip (México)', true, false, '{"percent": 3.6, "fixed": 2.5}'::jsonb),
  ('stripe', 'Stripe', 'gateway', false, 2, 'Pagos con tarjeta internacional', true, false, '{"percent": 2.9, "fixed": 0.30}'::jsonb),
  ('mercadopago', 'Mercado Pago', 'gateway', false, 3, 'Tarjeta, OXXO y SPEI', true, false, '{"percent": 3.49, "fixed": 0}'::jsonb),
  ('bank_transfer', 'Transferencia bancaria', 'manual', true, 4, 'Transferencia SPEI - requiere verificación de comprobante', false, true, '{"percent": 0, "fixed": 0}'::jsonb),
  ('cash', 'Efectivo', 'manual', false, 5, 'Pago en efectivo en sucursal', false, true, '{"percent": 0, "fixed": 0}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
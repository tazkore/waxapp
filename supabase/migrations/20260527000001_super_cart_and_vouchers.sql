-- Migration: Super Cart Tiers, Payment Vouchers, and Customer Preferences
-- Timestamp: 20260527000001

-- 1. orders: add discount/extras metadata (payment_method already NOT in prod per user)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method      text        DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS discount_tier       text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount     numeric     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extras              jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voucher_metadata    jsonb       DEFAULT NULL;

-- 2. customer_profiles: add preferences JSON blob
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS preferences         jsonb       DEFAULT '{}';

-- 3. payment_vouchers: store Clip voucher payload for reprint
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number     text        NOT NULL,
  payment_method   text        NOT NULL DEFAULT 'oxxo',   -- 'oxxo' | 'spei'
  reference_number text,
  barcode_url      text,
  expiration_date  timestamptz,
  clip_payload     jsonb       DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_order_id     ON public.payment_vouchers(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_order_number ON public.payment_vouchers(order_number);

-- RLS: owner can read their own vouchers (join via orders)
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_vouchers" ON public.payment_vouchers;
CREATE POLICY "owner_read_vouchers" ON public.payment_vouchers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_vouchers.order_id
        AND o.customer_email = auth.jwt() ->> 'email'
    )
  );

-- Service role bypass
DROP POLICY IF EXISTS "service_all_vouchers" ON public.payment_vouchers;
CREATE POLICY "service_all_vouchers" ON public.payment_vouchers
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.payment_vouchers TO authenticated;
GRANT ALL    ON public.payment_vouchers TO service_role;

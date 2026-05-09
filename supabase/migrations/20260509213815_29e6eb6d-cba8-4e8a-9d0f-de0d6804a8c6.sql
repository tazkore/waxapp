-- 1. Add affiliate role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- 2. wax_referrals
CREATE TABLE IF NOT EXISTS public.wax_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid,
  referrer_email text NOT NULL,
  invitee_email text,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_wax_referrals_referrer ON public.wax_referrals(referrer_email);
ALTER TABLE public.wax_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.wax_referrals
  FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR referrer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

CREATE POLICY "Users create own referrals" ON public.wax_referrals
  FOR INSERT TO authenticated
  WITH CHECK (referrer_user_id = auth.uid());

CREATE POLICY "Admin manage referrals" ON public.wax_referrals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  commission_pct numeric(5,2) NOT NULL DEFAULT 15.00,
  total_clicks integer NOT NULL DEFAULT 0,
  total_sales numeric(12,2) NOT NULL DEFAULT 0,
  pending_payout numeric(12,2) NOT NULL DEFAULT 0,
  paid_payout numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON public.affiliates(status);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own profile" ON public.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Affiliates create own profile" ON public.affiliates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Affiliates update own profile limited" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = (SELECT status FROM public.affiliates WHERE id = affiliates.id));

CREATE POLICY "Admin manage affiliates" ON public.affiliates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. affiliate_clicks
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  landing_path text,
  ip_address text,
  user_agent text,
  referer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_aff ON public.affiliate_clicks(affiliate_id);
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert clicks" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Affiliate view own clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_clicks.affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Admin view all clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 5. affiliate_sales
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid,
  order_number text,
  gross numeric(12,2) NOT NULL DEFAULT 0,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  net_profit numeric(12,2) NOT NULL DEFAULT 0,
  commission numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_sales_aff ON public.affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_sales_status ON public.affiliate_sales(status);
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate view own sales" ON public.affiliate_sales
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_sales.affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Admin manage sales" ON public.affiliate_sales
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
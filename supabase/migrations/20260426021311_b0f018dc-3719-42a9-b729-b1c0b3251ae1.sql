
-- Featured products for carousel
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured, featured_order) WHERE is_featured = true;

-- Chatbot knowledge base
CREATE TABLE IF NOT EXISTS public.chatbot_kb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_kb ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can insert kb" ON public.chatbot_kb FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update kb" ON public.chatbot_kb FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete kb" ON public.chatbot_kb FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin/mod can view all kb" ON public.chatbot_kb FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public can view active kb" ON public.chatbot_kb FOR SELECT TO anon
  USING (is_active = true);
CREATE POLICY "Authenticated can view active kb" ON public.chatbot_kb FOR SELECT TO authenticated
  USING (is_active = true);

CREATE TRIGGER update_chatbot_kb_updated_at BEFORE UPDATE ON public.chatbot_kb
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Amazon Seller config (single row per workspace)
CREATE TABLE IF NOT EXISTS public.amazon_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text,
  marketplace_id text DEFAULT 'A1AM78C64UM0Y8', -- Mexico
  region text DEFAULT 'na',
  refresh_token text,
  is_active boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  last_sync_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.amazon_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can insert amazon_config" ON public.amazon_config FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update amazon_config" ON public.amazon_config FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete amazon_config" ON public.amazon_config FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can view amazon_config" ON public.amazon_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_amazon_config_updated_at BEFORE UPDATE ON public.amazon_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Amazon products mirror
CREATE TABLE IF NOT EXISTS public.amazon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text NOT NULL UNIQUE,
  sku text,
  title text NOT NULL,
  price numeric DEFAULT 0,
  quantity integer DEFAULT 0,
  fulfillment_channel text, -- 'AMAZON' (FBA) or 'DEFAULT' (FBM)
  status text DEFAULT 'active',
  image_url text,
  raw jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.amazon_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/mod can view amazon_products" ON public.amazon_products FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert amazon_products" ON public.amazon_products FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update amazon_products" ON public.amazon_products FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete amazon_products" ON public.amazon_products FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Amazon FBA orders
CREATE TABLE IF NOT EXISTS public.amazon_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_order_id text NOT NULL UNIQUE,
  purchase_date timestamptz,
  order_status text,
  fulfillment_channel text,
  total numeric DEFAULT 0,
  buyer_email text,
  items jsonb DEFAULT '[]'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.amazon_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/mod can view amazon_orders" ON public.amazon_orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert amazon_orders" ON public.amazon_orders FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update amazon_orders" ON public.amazon_orders FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate welcome coupon on customer profile creation
CREATE OR REPLACE FUNCTION public.create_welcome_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_code text;
BEGIN
  -- Generate unique code: WELCOME + 6 random chars
  coupon_code := 'WELCOME' || upper(substring(md5(random()::text || NEW.user_id::text) FROM 1 FOR 6));
  
  INSERT INTO public.discounts (code, type, value, min_purchase, max_uses, is_active, expires_at)
  VALUES (
    coupon_code,
    'percentage',
    15,
    300,
    1,
    true,
    now() + interval '30 days'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_customer_profile_welcome_coupon ON public.customer_profiles;
CREATE TRIGGER on_customer_profile_welcome_coupon
  AFTER INSERT ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_welcome_coupon();

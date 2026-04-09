
-- Create discounts table
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL DEFAULT 0,
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Admin can manage discounts
CREATE POLICY "Admin can insert discounts" ON public.discounts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update discounts" ON public.discounts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete discounts" ON public.discounts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin/mod can view discounts" ON public.discounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Public can read active discounts for validation at checkout
CREATE POLICY "Anyone can read active discounts" ON public.discounts FOR SELECT TO anon USING (is_active = true);

-- Add public read policy for products (storefront)
CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated can view active products" ON public.products FOR SELECT TO authenticated USING (is_active = true);

-- Add updated_at trigger for discounts
CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

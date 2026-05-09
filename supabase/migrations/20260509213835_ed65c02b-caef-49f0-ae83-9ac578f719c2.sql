DROP POLICY IF EXISTS "Public insert clicks" ON public.affiliate_clicks;
CREATE POLICY "Public insert valid clicks" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_clicks.affiliate_id AND a.status = 'approved'));
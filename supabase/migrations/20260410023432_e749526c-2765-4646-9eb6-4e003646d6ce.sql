CREATE POLICY "Public can view seo_pages"
ON public.seo_pages
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated can view seo_pages"
ON public.seo_pages
FOR SELECT
TO authenticated
USING (true);
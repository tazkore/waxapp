-- Allow anonymous users to insert orders (checkout flow)
CREATE POLICY "Anyone can create orders via checkout"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated non-admin users to insert orders too
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

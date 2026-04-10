
-- 1. Drop overly permissive orders INSERT policies
DROP POLICY IF EXISTS "Anyone can create orders via checkout" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- 2. Create tighter orders INSERT policies requiring status='pending' and total > 0
CREATE POLICY "Anyone can create orders via checkout"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (status = 'pending' AND total > 0);

CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (status = 'pending' AND total > 0);

-- 3. Remove anon SELECT policy on discounts (exposes all discount codes publicly)
DROP POLICY IF EXISTS "Anyone can read active discounts" ON public.discounts;


-- 1. Remove direct INSERT policies for orders (anon and authenticated checkout)
-- Orders should ONLY be created via the create-order edge function (uses service_role)
DROP POLICY IF EXISTS "Anyone can create orders via checkout" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- 2. Replace orders UPDATE policy with restricted version
-- Admin/mod can update orders, but ONLY super admin can revert to draft
DROP POLICY IF EXISTS "Admin/mod can update orders" ON public.orders;

-- Super admin (alan@grupoko.com) can update orders including reverting to draft
CREATE POLICY "Super admin full order update"
ON public.orders FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email = 'alan@grupoko.com'
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admin/mod can update orders but NOT change status to draft
CREATE POLICY "Admin/mod can update orders no draft revert"
ON public.orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  -- If the user is the super admin, allow anything (handled by the other policy)
  -- Otherwise, prevent setting status to draft
  EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email = 'alan@grupoko.com'
  )
  OR status <> 'draft'
);

-- 3. Ensure no anon SELECT exists on discounts (defensive - remove if somehow present)
DROP POLICY IF EXISTS "Anyone can read active discounts" ON public.discounts;
DROP POLICY IF EXISTS "Public can view discounts" ON public.discounts;
DROP POLICY IF EXISTS "Anon can view discounts" ON public.discounts;

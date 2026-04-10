
-- Replace hardcoded email policies on orders
DROP POLICY IF EXISTS "Super admin full order update" ON public.orders;
DROP POLICY IF EXISTS "Admin/mod can update orders no draft revert" ON public.orders;

-- Super admin can do any update on orders
CREATE POLICY "Super admin full order update"
ON public.orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admin/mod can update orders but NOT revert to draft
CREATE POLICY "Admin/mod can update orders no draft revert"
ON public.orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  status <> 'draft'
);

-- Restrict user_roles INSERT so only super_admin can assign super_admin role
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN role = 'super_admin'::app_role THEN has_role(auth.uid(), 'super_admin'::app_role)
    ELSE has_role(auth.uid(), 'admin'::app_role)
  END
);

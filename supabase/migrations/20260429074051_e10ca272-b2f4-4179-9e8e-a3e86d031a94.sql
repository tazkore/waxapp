-- Permitir a super_admin (además de admin) gestionar marcas
DROP POLICY IF EXISTS "Admin can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admin can update brands" ON public.brands;
DROP POLICY IF EXISTS "Admin can delete brands" ON public.brands;
DROP POLICY IF EXISTS "Admin can view all brands" ON public.brands;

CREATE POLICY "Admin/super manage brands insert"
  ON public.brands FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/super manage brands update"
  ON public.brands FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/super manage brands delete"
  ON public.brands FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/super/mod view all brands"
  ON public.brands FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
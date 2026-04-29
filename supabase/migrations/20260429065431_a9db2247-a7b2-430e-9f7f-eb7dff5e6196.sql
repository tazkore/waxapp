-- Allow super_admin full access to blog_posts
DROP POLICY IF EXISTS "Admin can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin can delete posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin/mod can view all posts" ON public.blog_posts;

CREATE POLICY "Staff can insert posts"
ON public.blog_posts FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Staff can update posts"
ON public.blog_posts FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Staff can delete posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view all posts"
ON public.blog_posts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- 1. Blog posts table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  author text NOT NULL DEFAULT 'WAXAPP Team',
  category text NOT NULL DEFAULT 'general',
  meta_title text,
  meta_description text,
  keywords text[] NOT NULL DEFAULT '{}',
  og_image_url text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published posts"
ON public.blog_posts FOR SELECT TO anon
USING (status = 'published');

CREATE POLICY "Auth can view published posts"
ON public.blog_posts FOR SELECT TO authenticated
USING (status = 'published');

CREATE POLICY "Admin/mod can view all posts"
ON public.blog_posts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin can insert posts"
ON public.blog_posts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin can update posts"
ON public.blog_posts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin can delete posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_blog_posts_status ON public.blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);

ALTER TABLE public.blog_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;


-- Staff Tasks for Kanban board
CREATE TABLE public.staff_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to TEXT,
  assigned_avatar TEXT,
  order_id TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view staff_tasks" ON public.staff_tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin/mod can insert staff_tasks" ON public.staff_tasks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin/mod can update staff_tasks" ON public.staff_tasks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can delete staff_tasks" ON public.staff_tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_staff_tasks_updated_at BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEO Pages
CREATE TABLE public.seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL UNIQUE,
  page_title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  og_image_url TEXT,
  is_indexed BOOLEAN NOT NULL DEFAULT true,
  auto_sitemap BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view seo_pages" ON public.seo_pages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert seo_pages" ON public.seo_pages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update seo_pages" ON public.seo_pages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete seo_pages" ON public.seo_pages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seo_pages_updated_at BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

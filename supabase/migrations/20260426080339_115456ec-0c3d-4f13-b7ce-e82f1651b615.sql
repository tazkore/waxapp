CREATE TABLE public.environment_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  environment_type text NOT NULL DEFAULT 'lovable',
  project_url text NOT NULL,
  anon_key_secret_name text,
  service_key_secret_name text,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.environment_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view connections"
ON public.environment_connections FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert connections"
ON public.environment_connections FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update connections"
ON public.environment_connections FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete connections"
ON public.environment_connections FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_environment_connections_updated_at
BEFORE UPDATE ON public.environment_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
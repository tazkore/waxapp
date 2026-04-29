-- Sub-store staff assignments
CREATE TABLE IF NOT EXISTS public.sub_store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_store_id uuid NOT NULL REFERENCES public.sub_stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sub_store_id, user_id)
);

ALTER TABLE public.sub_store_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manage substore staff"
  ON public.sub_store_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users view own substore assignments"
  ON public.sub_store_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.has_substore_access(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.sub_store_staff
      WHERE user_id = _user_id AND sub_store_id = _store_id
    );
$$;

-- Allow assigned staff to update their sub_stores
DROP POLICY IF EXISTS "Substore staff update own store" ON public.sub_stores;
CREATE POLICY "Substore staff update own store"
  ON public.sub_stores FOR UPDATE TO authenticated
  USING (public.has_substore_access(auth.uid(), id))
  WITH CHECK (public.has_substore_access(auth.uid(), id));
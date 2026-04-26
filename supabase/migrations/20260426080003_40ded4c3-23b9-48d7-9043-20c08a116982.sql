CREATE TABLE public.api_key_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_email text,
  secret_name text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apikey_log_created ON public.api_key_access_log(created_at DESC);

ALTER TABLE public.api_key_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin view api key log"
  ON public.api_key_access_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System insert api key log"
  ON public.api_key_access_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
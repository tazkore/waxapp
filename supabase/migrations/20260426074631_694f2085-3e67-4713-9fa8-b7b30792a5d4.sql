
CREATE TABLE public.clip_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'manual',
  since timestamptz,
  until timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_remote integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  upserts integer NOT NULL DEFAULT 0,
  discrepancies_count integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  last_offset integer,
  last_cursor text,
  error_message text,
  parent_run_id uuid,
  triggered_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX idx_clip_sync_runs_started ON public.clip_sync_runs(started_at DESC);
CREATE INDEX idx_clip_sync_runs_status ON public.clip_sync_runs(status);

ALTER TABLE public.clip_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod view clip_sync_runs"
ON public.clip_sync_runs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin manage clip_sync_runs"
ON public.clip_sync_runs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  carrier text NOT NULL,
  service_level text,
  tracking_number text,
  tracking_url text,
  label_url text,
  status text NOT NULL DEFAULT 'created',
  cost numeric NOT NULL DEFAULT 0,
  weight_kg numeric,
  origin_postal text,
  destination_postal text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view shipments" ON public.shipments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin/mod can insert shipments" ON public.shipments FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin/mod can update shipments" ON public.shipments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admin can delete shipments" ON public.shipments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shipments_order ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_number);

-- Slug for products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.products
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(id::text from 1 for 6)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;

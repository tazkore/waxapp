ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS origin_domain text;
CREATE INDEX IF NOT EXISTS idx_orders_origin_domain ON public.orders(origin_domain);
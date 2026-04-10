
-- Add super_admin to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Remove orders from Realtime to protect customer PII
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;

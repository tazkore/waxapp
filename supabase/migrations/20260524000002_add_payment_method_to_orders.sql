-- Add payment_method column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card';

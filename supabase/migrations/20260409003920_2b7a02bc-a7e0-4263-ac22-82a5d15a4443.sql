
-- Customer profiles table
CREATE TABLE public.customer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Customers can view their own profile
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Customers can insert their own profile
CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Customers can update their own profile
CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins/mods can view all profiles
CREATE POLICY "Admin/mod can view all customer profiles"
ON public.customer_profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

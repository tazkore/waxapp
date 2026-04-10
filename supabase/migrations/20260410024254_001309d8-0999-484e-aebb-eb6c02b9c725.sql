
-- Wholesale Leads table
CREATE TABLE public.wholesale_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'prospecto',
  assigned_to TEXT,
  notes TEXT,
  credit_limit NUMERIC DEFAULT 0,
  credit_status TEXT DEFAULT 'sin_credito',
  credit_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view wholesale_leads" ON public.wholesale_leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert wholesale_leads" ON public.wholesale_leads FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update wholesale_leads" ON public.wholesale_leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete wholesale_leads" ON public.wholesale_leads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  category TEXT DEFAULT 'general',
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'borrador',
  expected_delivery TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert purchase_orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update purchase_orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete purchase_orders" ON public.purchase_orders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Accounts Payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendiente',
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod can view accounts_payable" ON public.accounts_payable FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admin can insert accounts_payable" ON public.accounts_payable FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update accounts_payable" ON public.accounts_payable FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete accounts_payable" ON public.accounts_payable FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

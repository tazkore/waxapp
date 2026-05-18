-- Comprehensive admin grants for all WAXAPP admin tables
-- Root cause: PostgREST requires GRANT even when RLS policies exist

-- Helper function for RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'moderator')
  );
$$;

-- Blanket GRANT to authenticated (RLS policies still enforce row-level security)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Admin full-access policies for all tables missing them
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'orders','order_status_history','products','product_variants',
    'customer_profiles','affiliates','affiliate_clicks','affiliate_sales',
    'blog_posts','brands','banners','staff_tasks',
    'purchase_orders','suppliers','accounts_payable',
    'seo_pages','seo_redirects','theme_settings',
    'nav_menus','nav_menu_items',
    'amazon_config','amazon_products','amazon_orders',
    'payment_gateways','payment_transactions','payment_transaction_audit',
    'payment_proofs','shipments','carts',
    'custom_fields','domains','environment_connections',
    'email_templates','sub_stores','sub_store_versions',
    'admin_notifications','api_key_access_log',
    'wholesale_leads','import_jobs','custom_pages',
    'bank_accounts','clip_sync_runs','clients',
    'client_notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('
        DROP POLICY IF EXISTS "admin_full_access" ON public.%I;
        CREATE POLICY "admin_full_access" ON public.%I
          FOR ALL TO authenticated
          USING (public.is_admin())
          WITH CHECK (public.is_admin());
      ', t, t);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Skip tables that don''t exist in this project
    END;
  END LOOP;
END;
$$;

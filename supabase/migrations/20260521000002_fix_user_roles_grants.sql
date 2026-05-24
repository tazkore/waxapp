-- Otorgar acceso a service_role en user_roles (necesario para Edge Functions de admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Asegurar que alan@grupoko.com tiene rol super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('14cfd503-50d9-4f11-b2d9-509c5f1bbcfe', 'super_admin')
ON CONFLICT DO NOTHING;

-- También asegurar rol admin como fallback
INSERT INTO public.user_roles (user_id, role)
VALUES ('14cfd503-50d9-4f11-b2d9-509c5f1bbcfe', 'admin')
ON CONFLICT DO NOTHING;

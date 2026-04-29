import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export const ALL_PERMISSIONS = [
  { key: 'blog.generate_ai', label: 'Generar blog con IA' },
  { key: 'blog.publish', label: 'Publicar blog' },
  { key: 'products.manage', label: 'Gestionar productos' },
  { key: 'orders.manage', label: 'Gestionar pedidos' },
  { key: 'clients.manage', label: 'Gestionar clientes' },
  { key: 'marketing.manage', label: 'Marketing y descuentos' },
  { key: 'payments.manage', label: 'Gestionar pagos' },
  { key: 'media.manage', label: 'Gestionar medios' },
  { key: 'seo.manage', label: 'Gestionar SEO' },
  { key: 'theme.manage', label: 'Gestionar tema/diseño' },
  { key: 'integrations.manage', label: 'Gestionar integraciones' },
  { key: 'amazon.manage', label: 'Gestionar Amazon' },
  { key: 'chatbot.manage', label: 'Gestionar chatbot' },
  { key: 'staff.manage', label: 'Gestionar staff (solo super_admin)' },
  { key: 'settings.manage', label: 'Configuración del sistema' },
];

export const usePermissions = () => {
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', user.id);
      setPermissions((data ?? []).map((d: any) => d.permission_key));
      setLoading(false);
    };
    fetchPerms();
  }, []);

  const can = (key: string) => isSuperAdmin || permissions.includes(key);
  return { permissions, can, loading: loading || roleLoading, isSuperAdmin };
};

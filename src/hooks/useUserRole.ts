import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'moderator' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      setRole(data?.role as AppRole ?? null);
      setLoading(false);
    };

    fetchRole();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isModerator: role === 'moderator' };
};

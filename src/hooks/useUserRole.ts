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

      // Fetch highest-privilege role (super_admin > admin > moderator)
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const roles = data.map(d => d.role as string);
        if (roles.includes('super_admin')) setRole('super_admin');
        else if (roles.includes('admin')) setRole('admin');
        else if (roles.includes('moderator')) setRole('moderator');
        else setRole(null);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isModerator: role === 'moderator' };
};

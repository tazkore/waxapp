import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export interface AccessibleSubStore {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  role: string; // 'super_admin' | 'admin' | 'moderator'
}

export const useAccessibleSubStores = () => {
  const { isSuperAdmin, role, loading: roleLoading } = useUserRole();
  const [stores, setStores] = useState<AccessibleSubStore[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStores([]); setLoading(false); return; }

    if (isSuperAdmin) {
      const { data } = await supabase
        .from("sub_stores")
        .select("id,name,slug,brand_id")
        .eq("is_active", true)
        .order("name");
      setStores((data ?? []).map(s => ({ ...s, role: 'super_admin' })));
    } else {
      const { data: assigns } = await supabase
        .from("sub_store_staff")
        .select("sub_store_id, role, sub_stores!inner(id,name,slug,brand_id,is_active)")
        .eq("user_id", user.id);
      const list = (assigns ?? [])
        .filter((a: any) => a.sub_stores?.is_active)
        .map((a: any) => ({
          id: a.sub_stores.id,
          name: a.sub_stores.name,
          slug: a.sub_stores.slug,
          brand_id: a.sub_stores.brand_id,
          role: a.role,
        }));
      setStores(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, isSuperAdmin]);

  return { stores, loading: loading || roleLoading, refresh, isSuperAdmin, role };
};

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IntegrationLite {
  slug: string;
  is_installed: boolean;
  is_active: boolean;
}

let cache: Record<string, IntegrationLite> | null = null;
const listeners = new Set<(s: Record<string, IntegrationLite>) => void>();

async function loadOnce() {
  const { data } = await supabase.from('integrations').select('slug,is_installed,is_active');
  const map: Record<string, IntegrationLite> = {};
  (data || []).forEach((row: any) => { map[row.slug] = row; });
  cache = map;
  listeners.forEach((fn) => fn(map));
}

export function useInstalledIntegrations() {
  const [bySlug, setBySlug] = useState<Record<string, IntegrationLite>>(cache || {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setBySlug);
    if (!cache) loadOnce().finally(() => setLoading(false));
    else setLoading(false);

    const channel = supabase
      .channel('integrations-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integrations' }, () => loadOnce())
      .subscribe();

    return () => {
      listeners.delete(setBySlug);
      supabase.removeChannel(channel);
    };
  }, []);

  return { bySlug, loading, refresh: loadOnce };
}

export function useIntegrationActive(slug: string): boolean {
  const { bySlug } = useInstalledIntegrations();
  return !!bySlug[slug]?.is_active;
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'waxapp_affiliate_ref';
const STORAGE_AT = 'waxapp_affiliate_ref_at';
const TTL_DAYS = 30;

const AffiliateRefTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Expire stale ref
    const at = localStorage.getItem(STORAGE_AT);
    if (at) {
      const ageDays = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > TTL_DAYS) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_AT);
      }
    }

    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === ref) return;

    localStorage.setItem(STORAGE_KEY, ref);
    localStorage.setItem(STORAGE_AT, new Date().toISOString());

    supabase.functions
      .invoke('track-affiliate-click', {
        body: { code: ref, landing_path: location.pathname + location.search },
      })
      .catch(() => {});
  }, [location.pathname, location.search]);

  return null;
};

export default AffiliateRefTracker;

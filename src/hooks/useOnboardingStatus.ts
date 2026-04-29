import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "wax_onboarding_dismissed";

export function useOnboardingStatus() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }
    supabase
      .from("theme_settings")
      .select("onboarding_completed,site_name")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setNeedsOnboarding(!data || !data.onboarding_completed);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    needsOnboarding,
    loading,
    dismiss: () => setNeedsOnboarding(false),
    resetDismiss: () => {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      setNeedsOnboarding(true);
    },
  };
}

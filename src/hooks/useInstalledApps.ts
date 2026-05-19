import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstalledApp {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon_url: string | null;
}

export const useInstalledApps = () => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("integrations")
      .select("id,slug,name,description,category,icon_url")
      .eq("is_installed", true)
      .eq("is_active", true)
      .order("name");
    setApps((data as InstalledApp[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("installed-apps-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "integrations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { apps, loading };
};

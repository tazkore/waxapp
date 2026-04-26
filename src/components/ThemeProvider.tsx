import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Loads active theme_settings and applies them to <html> as CSS variables,
 * <link rel="icon"> and <title>. No re-render of the app tree needed.
 */
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    let cancelled = false;

    const apply = (t: any) => {
      if (!t || cancelled) return;
      const root = document.documentElement;
      if (t.color_primary) root.style.setProperty('--primary', t.color_primary);
      if (t.color_secondary) root.style.setProperty('--secondary', t.color_secondary);
      if (t.color_background) root.style.setProperty('--background', t.color_background);
      if (t.color_foreground) root.style.setProperty('--foreground', t.color_foreground);
      if (t.color_accent) root.style.setProperty('--accent', t.color_accent);
      if (t.color_primary) root.style.setProperty('--ring', t.color_primary);

      // Favicon
      if (t.favicon_url) {
        let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = t.favicon_url;
      }

      // Site name as fallback title
      if (t.site_name && !document.title) document.title = t.site_name;

      // Custom CSS
      if (t.custom_css) {
        let style = document.getElementById('theme-custom-css') as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement('style');
          style.id = 'theme-custom-css';
          document.head.appendChild(style);
        }
        style.textContent = t.custom_css;
      }
    };

    supabase
      .from('theme_settings')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => apply(data));

    // Realtime: react to admin updates
    const channel = supabase
      .channel('theme-settings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'theme_settings' }, (payload) => {
        apply(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getSiteByHost } from '@/config/siteConfig';

interface SeoData {
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  keywords: string[];
  is_indexed: boolean;
}

const useSeoMeta = () => {
  const { pathname } = useLocation();
  const [seo, setSeo] = useState<SeoData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      const site = getSiteByHost(typeof window !== 'undefined' ? window.location.hostname : '');
      const DEFAULT_TITLE = site.seoTitle;
      const DEFAULT_DESCRIPTION = site.seoDescription;

      // Try exact match first, then partial
      const { data } = await supabase
        .from('seo_pages')
        .select('meta_title, meta_description, og_image_url, keywords, is_indexed')
        .eq('page_path', pathname)
        .maybeSingle();

      if (cancelled) return;

      const d = data as SeoData | null;
      setSeo(d);

      // Title
      document.title = d?.meta_title || DEFAULT_TITLE;

      // Helper to set/remove a meta tag
      const setMeta = (name: string, content: string | null, attr = 'name') => {
        let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
        if (content) {
          if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
          }
          el.setAttribute('content', content);
        } else {
          el?.remove();
        }
      };

      setMeta('description', d?.meta_description || DEFAULT_DESCRIPTION);
      setMeta('keywords', d?.keywords?.length ? d.keywords.join(', ') : null);

      // Robots
      setMeta('robots', d?.is_indexed === false ? 'noindex, nofollow' : 'index, follow');

      // Canonical (per-domain authority)
      const canonicalHref = `${site.canonicalBase}${pathname}`;
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalHref);

      // Open Graph
      setMeta('og:title', d?.meta_title || DEFAULT_TITLE, 'property');
      setMeta('og:description', d?.meta_description || DEFAULT_DESCRIPTION, 'property');
      setMeta('og:url', canonicalHref, 'property');
      setMeta('og:type', 'website', 'property');
      setMeta('og:site_name', site.siteName, 'property');
      if (d?.og_image_url || site.ogImage) {
        setMeta('og:image', d?.og_image_url || site.ogImage, 'property');
      }

      // Twitter
      setMeta('twitter:card', 'summary_large_image');
      setMeta('twitter:title', d?.meta_title || DEFAULT_TITLE);
      setMeta('twitter:description', d?.meta_description || DEFAULT_DESCRIPTION);
    };

    apply();
    return () => { cancelled = true; };
  }, [pathname]);

  return seo;
};

export default useSeoMeta;

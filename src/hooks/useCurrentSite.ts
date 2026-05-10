import { useMemo } from 'react';
import { getSiteByHost, type SiteIdentity } from '@/config/siteConfig';

const getHostname = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
};

const useCurrentSite = () => {
  const hostname = getHostname();
  const site: SiteIdentity = useMemo(() => getSiteByHost(hostname), [hostname]);

  const canonicalUrl = (pathname: string) => {
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${site.canonicalBase}${path}`;
  };

  return { site, canonicalUrl, hostname };
};

export default useCurrentSite;
export { getHostname };

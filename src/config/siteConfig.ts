/**
 * Multi-domain (white-label) site configuration.
 * Maps hostnames to brand identities. The same codebase serves multiple domains
 * with distinct logos, colors, SEO metadata and canonical URLs while sharing
 * inventory.
 */

export type SiteColors = {
  primary: string;        // HSL components only, e.g. "142 76% 45%"
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

export type SiteIdentity = {
  key: string;
  hostname: string;
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  canonicalBase: string;        // e.g. "https://vapewax.com.mx"
  colors: SiteColors;
  seoVariant: 'A' | 'B';        // controls description rewriting to avoid duplicate-content penalties
  hreflang: string;             // BCP 47 language tag, e.g. 'es-MX'
};

const DEFAULT_SITE: SiteIdentity = {
  key: 'waxapp',
  hostname: 'waxapp.mx',
  siteName: 'WAXAPP',
  logoUrl: '/placeholder.svg',
  faviconUrl: '/favicon.ico',
  seoTitle: 'WAXAPP — CBD Premium & Nano Tecnología',
  seoDescription: 'Descubre los mejores productos de CBD con nanotecnología en México.',
  ogImage: '/placeholder.svg',
  canonicalBase: 'https://waxapp.mx',
  seoVariant: 'A',
  hreflang: 'es-MX',
  colors: {
    primary: '142 90% 45%',       // neon green
    secondary: '38 100% 50%',     // amber
    accent: '142 90% 45%',
    background: '0 0% 4%',        // #0A0A0A
    foreground: '0 0% 98%',
  },
};

const SITES: SiteIdentity[] = [
  DEFAULT_SITE,
  {
    key: 'waxapp-www',
    hostname: 'www.waxapp.mx',
    siteName: 'WAXAPP',
    logoUrl: '/placeholder.svg',
    faviconUrl: '/favicon.ico',
    seoTitle: 'WAXAPP — CBD Premium & Nano Tecnología',
    seoDescription: 'Descubre los mejores productos de CBD con nanotecnología en México.',
    ogImage: '/placeholder.svg',
    canonicalBase: 'https://www.waxapp.mx',
    seoVariant: 'A',
    hreflang: 'es-MX',
    colors: DEFAULT_SITE.colors,
  },
  {
    key: 'vapewax',
    hostname: 'vapewax.com.mx',
    siteName: 'VapeWax',
    logoUrl: '/placeholder.svg',
    faviconUrl: '/favicon.ico',
    seoTitle: 'VapeWax — Vapes Premium México',
    seoDescription: 'Vaporizadores y extracciones premium con envío express en todo México.',
    ogImage: '/placeholder.svg',
    canonicalBase: 'https://vapewax.com.mx',
    seoVariant: 'B',
    hreflang: 'es-MX',
    colors: {
      primary: '142 90% 45%',     // neon green
      secondary: '38 100% 50%',
      accent: '142 90% 50%',
      background: '0 0% 4%',
      foreground: '0 0% 98%',
    },
  },
  {
    key: 'extraccionwax',
    hostname: 'extraccionwax.com',
    siteName: 'ExtracciónWax',
    logoUrl: '/placeholder.svg',
    faviconUrl: '/favicon.ico',
    seoTitle: 'ExtracciónWax — Expertos en Extracciones Wax',
    seoDescription: 'Concentrados y extracciones de alta gama. Envío discreto a todo México.',
    ogImage: '/placeholder.svg',
    canonicalBase: 'https://extraccionwax.com',
    seoVariant: 'B',
    hreflang: 'es-MX',
    colors: {
      primary: '210 100% 56%',    // electric blue
      secondary: '38 100% 50%',
      accent: '210 100% 56%',
      background: '0 0% 4%',
      foreground: '0 0% 98%',
    },
  },
];

export const getSiteByHost = (hostname: string | undefined | null): SiteIdentity => {
  if (!hostname) return DEFAULT_SITE;
  const h = hostname.toLowerCase();
  return (
    SITES.find((s) => s.hostname.toLowerCase() === h) ??
    SITES.find((s) => h.endsWith('.' + s.hostname.toLowerCase())) ??
    DEFAULT_SITE
  );
};

/**
 * Domains that share the same content and should declare each other as hreflang
 * alternates (excludes www.* aliases to avoid duplicate alternates).
 */
export const HREFLANG_ALTERNATES: SiteIdentity[] = SITES.filter(
  (s) => !s.hostname.startsWith('www.')
);

export { DEFAULT_SITE, SITES };

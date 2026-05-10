/**
 * Anti-duplicate-content rewriting for multi-domain SEO.
 * Variant 'A' returns the input unchanged. Variant 'B' applies deterministic,
 * lossless transformations (synonym swap + sentence reordering + brand prefix/suffix)
 * so search engines see distinct content per domain.
 */

const SYNONYMS: Array<[RegExp, string]> = [
  [/\bpremium\b/gi, 'de alta gama'],
  [/\bcomprar\b/gi, 'adquirir'],
  [/\bproducto\b/gi, 'artículo'],
  [/\bcalidad\b/gi, 'excelencia'],
  [/\bmejor\b/gi, 'óptimo'],
];

const applySynonyms = (text: string): string =>
  SYNONYMS.reduce((acc, [re, repl]) => acc.replace(re, repl), text);

const swapFirstTwoSentences = (text: string): string => {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return text;
  return [parts[1], parts[0], ...parts.slice(2)].join(' ');
};

export const rewriteDescription = (
  text: string | null | undefined,
  variant: 'A' | 'B',
  siteName?: string
): string => {
  if (!text) return '';
  if (variant === 'A') return text;
  const swapped = swapFirstTwoSentences(text);
  const synonymized = applySynonyms(swapped);
  const prefix = siteName ? `Disponible en ${siteName}: ` : '';
  const suffix = ' — Envío express a todo México.';
  return `${prefix}${synonymized}${suffix}`;
};

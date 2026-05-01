/**
 * Heuristic suggestion of category and brand based on product name + GTIN + URL.
 * - Tries fuzzy match against existing catalog (brands table, distinct categories) first.
 * - Falls back to keyword rules tailored to the bio-tech vape catalog.
 *
 * Pure function — no IO. The catalog is passed in by the caller so this module can be
 * shared between the importer, the editor and tests.
 */

export interface CatalogEntry {
  /** Lowercased label used for matching */
  match: string;
  /** Original label to surface in the UI */
  label: string;
}

export interface SuggestionInput {
  name?: string | null;
  gtin?: string | null;
  description?: string | null;
  source_url?: string | null;
  /** Existing values on the row, used to decide if a suggestion is meaningful */
  current_category?: string | null;
  current_brand?: string | null;
}

export interface CategoryBrandSuggestion {
  category: string | null;
  brand: string | null;
  /** Confidence 0-1 per field, useful for UI accents */
  category_confidence: number;
  brand_confidence: number;
  /** Human-readable why */
  category_reason?: string;
  brand_reason?: string;
}

const CATEGORY_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Vapeadores desechables", patterns: [/desechable/i, /\bdisposable\b/i, /\bpod\s*desechable/i, /\d{3,5}\s*puffs?/i] },
  { label: "Pods recargables", patterns: [/\bpod\b/i, /recargable/i, /\bopen\s*system\b/i] },
  { label: "Cartuchos 510", patterns: [/\b510\b/i, /cartucho/i, /\bcart(s)?\b/i] },
  { label: "Mods y baterías", patterns: [/\bmod\b/i, /\bbox\b/i, /bater[ií]a\b/i, /\bbattery\b/i] },
  { label: "E-líquidos", patterns: [/e-?l[ií]quido/i, /e-?juice/i, /\bvape\s*juice/i, /\bsalts?\b/i, /sales?\s+nic/i, /freebase/i, /\b\d+\s*(ml|mL)\b.*nic/i] },
  { label: "Flor", patterns: [/\bflor\b/i, /\bflower\b/i, /\bbud\b/i, /cogollo/i, /\bgrams?\b.*(thc|cbd|cannab)/i] },
  { label: "Concentrados", patterns: [/\b(hash|hashish|resin|rosin|wax|shatter|distillate|live\s*resin|badder|crumble)\b/i] },
  { label: "Comestibles", patterns: [/\bedible|comestible|gomit|gummies|chocolate|brownie\b/i] },
  { label: "Aceites CBD", patterns: [/\bcbd\b.*(oil|aceite|tinctur)/i, /\baceite\b.*(cbd|cann)/i] },
  { label: "Accesorios", patterns: [/\b(grinder|paper|rolling|cone|bong|pipe|pipa|encendedor|lighter|charger|cargador|case|funda|coil|mecha|herramienta)\b/i] },
];

const BRAND_HINTS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "ELF BAR", patterns: [/\belf\s*bar\b/i, /\belfbar\b/i] },
  { label: "Lost Mary", patterns: [/\blost\s*mary\b/i] },
  { label: "Vaporesso", patterns: [/\bvaporesso\b/i] },
  { label: "SMOK", patterns: [/\bsmok\b/i] },
  { label: "Geek Bar", patterns: [/\bgeek\s*bar\b/i, /\bgeekbar\b/i] },
  { label: "Hyde", patterns: [/\bhyde\b/i] },
  { label: "RandM", patterns: [/\br\s*and\s*m\b/i, /\brandm\b/i] },
  { label: "Pax", patterns: [/\bpax\b/i] },
  { label: "Storz & Bickel", patterns: [/\bstorz\b/i, /\bvolcano\b/i, /\bmighty\b.*vape/i] },
  { label: "Puffco", patterns: [/\bpuffco\b/i, /\bpeak\s*pro\b/i] },
  { label: "Raw", patterns: [/\braw\b.*(paper|cone)/i] },
  { label: "Ooze", patterns: [/\booze\b/i] },
  { label: "Yocan", patterns: [/\byocan\b/i] },
];

/** Normalize for fuzzy compare: lowercase + strip accents + collapse whitespace */
export function norm(s: string | null | undefined): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s\-&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuzzy contains: any catalog entry whose tokens are all present in the haystack */
function findInCatalog(haystack: string, catalog: CatalogEntry[]): { entry: CatalogEntry; score: number } | null {
  if (!haystack || catalog.length === 0) return null;
  let best: { entry: CatalogEntry; score: number } | null = null;
  for (const c of catalog) {
    const tokens = c.match.split(" ").filter((t) => t.length >= 2);
    if (tokens.length === 0) continue;
    const allHit = tokens.every((t) => haystack.includes(t));
    if (!allHit) continue;
    // Score: longer matches win
    const score = c.match.length / Math.max(haystack.length, 1);
    if (!best || score > best.score) best = { entry: c, score };
  }
  return best;
}

export function suggestCategoryAndBrand(
  input: SuggestionInput,
  catalogs: { brands?: CatalogEntry[]; categories?: CatalogEntry[] } = {}
): CategoryBrandSuggestion {
  const haystack = norm(`${input.name || ""} ${input.description || ""} ${input.source_url || ""}`);
  const result: CategoryBrandSuggestion = {
    category: null,
    brand: null,
    category_confidence: 0,
    brand_confidence: 0,
  };

  // ---- BRAND ----
  // 1. Match against catalog (existing brands table)
  const brandHit = findInCatalog(haystack, catalogs.brands || []);
  if (brandHit) {
    result.brand = brandHit.entry.label;
    result.brand_confidence = Math.min(0.95, 0.6 + brandHit.score);
    result.brand_reason = `Coincide con marca registrada "${brandHit.entry.label}"`;
  } else {
    // 2. Hint rules
    for (const hint of BRAND_HINTS) {
      if (hint.patterns.some((p) => p.test(haystack))) {
        result.brand = hint.label;
        result.brand_confidence = 0.7;
        result.brand_reason = `Detectada por patrón conocido de "${hint.label}"`;
        break;
      }
    }
  }
  // 3. GTIN-based: if gtin is provided we can't resolve to a real brand without GS1,
  //    but we can mark low-confidence "verified GTIN" if the row already has a brand.
  if (!result.brand && input.gtin && /^\d{8,14}$/.test(String(input.gtin))) {
    // First 3 digits of GS1 prefix can hint country (not brand) — kept as a note only.
    result.brand_reason = result.brand_reason || `GTIN ${input.gtin} válido — sin coincidencia de marca`;
  }

  // ---- CATEGORY ----
  // 1. Match against existing categories
  const catHit = findInCatalog(haystack, catalogs.categories || []);
  if (catHit) {
    result.category = catHit.entry.label;
    result.category_confidence = Math.min(0.95, 0.6 + catHit.score);
    result.category_reason = `Coincide con categoría existente "${catHit.entry.label}"`;
  } else {
    // 2. Rule-based
    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some((p) => p.test(haystack))) {
        result.category = rule.label;
        result.category_confidence = 0.75;
        result.category_reason = `Detectada por palabras clave (${rule.label})`;
        break;
      }
    }
  }

  // Suppress suggestions that match what's already on the row
  if (result.brand && norm(input.current_brand) === norm(result.brand)) {
    result.brand = null;
    result.brand_confidence = 0;
    result.brand_reason = undefined;
  }
  if (result.category && norm(input.current_category) === norm(result.category)) {
    result.category = null;
    result.category_confidence = 0;
    result.category_reason = undefined;
  }

  return result;
}

/** Returns true when there's at least one actionable suggestion */
export function hasSuggestion(s: CategoryBrandSuggestion): boolean {
  return !!(s.category || s.brand);
}

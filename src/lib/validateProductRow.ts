// Shared validation for scraped/imported product rows.
// Returns blocking errors, soft warnings and a 0-100 completeness score
// so the UI can guide the user to fill missing data before importing.

export type Severity = "error" | "warning";

export interface FieldIssue {
  field: string;
  message: string;
  severity: Severity;
  /** Action hint the UI can map to a button/handler */
  action?: "image" | "ai" | "manual";
}

export interface ValidationResult {
  errors: FieldIssue[];
  warnings: FieldIssue[];
  /** 0-100 completeness score considering required + recommended fields */
  completeness: number;
  canImport: boolean;
}

const isHttpUrl = (s: any): boolean => {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const firstImage = (it: any): string | null => {
  if (Array.isArray(it?.images) && it.images.length) {
    const found = it.images.find((u: any) => isHttpUrl(u));
    if (found) return found;
  }
  if (isHttpUrl(it?.image_url)) return it.image_url;
  return null;
};

/** Weights sum to 100 — keep in sync if you add fields */
const WEIGHTS = {
  name: 20,
  price: 15,
  image: 15,
  description: 10,
  category: 8,
  brand: 7,
  meta_title: 8,
  meta_description: 7,
  focus_keyword: 4,
  attributes: 3,
  sku_or_gtin: 3,
} as const;

export function validateProductRow(it: any): ValidationResult {
  const errors: FieldIssue[] = [];
  const warnings: FieldIssue[] = [];
  let score = 0;

  // -------- name (required)
  const name = typeof it?.name === "string" ? it.name.trim() : "";
  if (!name) {
    errors.push({ field: "name", message: "Falta el nombre del producto", severity: "error", action: "manual" });
  } else if (name.length > 200) {
    errors.push({ field: "name", message: "El nombre supera 200 caracteres", severity: "error", action: "manual" });
  } else {
    score += WEIGHTS.name;
  }

  // -------- price (required, must be numeric)
  const priceRaw = it?.price;
  const priceNum = Number(priceRaw);
  if (priceRaw == null || priceRaw === "" ) {
    errors.push({ field: "price", message: "Falta el precio", severity: "error", action: "manual" });
  } else if (!Number.isFinite(priceNum) || priceNum < 0) {
    errors.push({ field: "price", message: `Precio inválido (${priceRaw})`, severity: "error", action: "manual" });
  } else {
    score += WEIGHTS.price;
  }

  // -------- compare_at_price (optional, validate if present)
  if (it?.compare_at_price != null && it.compare_at_price !== "") {
    const cmp = Number(it.compare_at_price);
    if (!Number.isFinite(cmp)) {
      warnings.push({ field: "compare_at_price", message: "Precio comparativo inválido", severity: "warning", action: "manual" });
    } else if (Number.isFinite(priceNum) && cmp <= priceNum) {
      warnings.push({ field: "compare_at_price", message: "El precio comparativo debería ser mayor al precio", severity: "warning", action: "manual" });
    }
  }

  // -------- image (recommended)
  const img = firstImage(it);
  const rawImg = Array.isArray(it?.images) ? it.images[0] : it?.image_url;
  if (rawImg && !isHttpUrl(rawImg)) {
    errors.push({ field: "image_url", message: "URL de imagen no es http(s)", severity: "error", action: "image" });
  } else if (!img) {
    warnings.push({ field: "image_url", message: "Sin imagen — usa Auto-buscar", severity: "warning", action: "image" });
  } else {
    score += WEIGHTS.image;
  }

  // -------- canonical_url
  const canonical = it?.source_url || it?.canonical_url || null;
  if (canonical && !isHttpUrl(canonical)) {
    warnings.push({ field: "canonical_url", message: "URL canónica inválida", severity: "warning", action: "manual" });
  }

  // -------- description (recommended)
  const description = typeof it?.description === "string" ? it.description.trim() : "";
  if (!description) {
    warnings.push({ field: "description", message: "Sin descripción — completa con IA", severity: "warning", action: "ai" });
  } else if (description.length < 80) {
    warnings.push({ field: "description", message: "Descripción muy corta (<80 chars)", severity: "warning", action: "ai" });
    score += WEIGHTS.description / 2;
  } else {
    score += WEIGHTS.description;
  }

  // -------- category
  if (it?.category) score += WEIGHTS.category;
  else warnings.push({ field: "category", message: "Sin categoría", severity: "warning", action: "ai" });

  // -------- brand
  if (it?.brand || it?.brand_name) score += WEIGHTS.brand;
  else warnings.push({ field: "brand", message: "Sin marca", severity: "warning", action: "ai" });

  // -------- SEO meta
  const mt = (it?.meta_title || "").length;
  if (mt >= 30 && mt <= 60) score += WEIGHTS.meta_title;
  else if (mt > 0) {
    score += WEIGHTS.meta_title / 2;
    warnings.push({ field: "meta_title", message: `Meta título fuera de 30-60 (actual ${mt})`, severity: "warning", action: "ai" });
  } else {
    warnings.push({ field: "meta_title", message: "Falta meta título", severity: "warning", action: "ai" });
  }

  const md = (it?.meta_description || "").length;
  if (md >= 70 && md <= 160) score += WEIGHTS.meta_description;
  else if (md > 0) {
    score += WEIGHTS.meta_description / 2;
    warnings.push({ field: "meta_description", message: `Meta descripción fuera de 70-160 (actual ${md})`, severity: "warning", action: "ai" });
  } else {
    warnings.push({ field: "meta_description", message: "Falta meta descripción", severity: "warning", action: "ai" });
  }

  if (it?.focus_keyword) score += WEIGHTS.focus_keyword;
  else warnings.push({ field: "focus_keyword", message: "Sin palabra clave principal", severity: "warning", action: "ai" });

  // -------- attributes (rich data)
  const attrs = it?.attributes && typeof it.attributes === "object" ? it.attributes : null;
  const attrCount = attrs ? Object.keys(attrs).filter((k) => {
    const v = attrs[k];
    return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length : 0;
  if (attrCount >= 3) score += WEIGHTS.attributes;
  else if (attrCount > 0) score += WEIGHTS.attributes / 2;
  else warnings.push({ field: "attributes", message: "Sin atributos (sabores, ingredientes…)", severity: "warning", action: "ai" });

  // -------- sku/gtin
  if (it?.sku || it?.gtin || it?.mpn) score += WEIGHTS.sku_or_gtin;

  const completeness = Math.min(100, Math.round(score));
  return {
    errors,
    warnings,
    completeness,
    canImport: errors.length === 0,
  };
}

/** Aggregate stats for a batch — useful for the preview header */
export function aggregateValidation(items: any[]): {
  total: number;
  ready: number;
  withErrors: number;
  withWarnings: number;
  avgCompleteness: number;
  missingImage: number;
  missingDescription: number;
  missingPrice: number;
} {
  const total = items.length;
  let ready = 0;
  let withErrors = 0;
  let withWarnings = 0;
  let sum = 0;
  let missingImage = 0;
  let missingDescription = 0;
  let missingPrice = 0;
  for (const it of items) {
    const r = validateProductRow(it);
    sum += r.completeness;
    if (r.errors.length) withErrors++;
    else ready++;
    if (r.warnings.length) withWarnings++;
    if (r.errors.some((e) => e.field === "price") || r.warnings.some((w) => w.field === "price")) missingPrice++;
    if (r.warnings.some((w) => w.field === "image_url") || r.errors.some((e) => e.field === "image_url")) missingImage++;
    if (r.warnings.some((w) => w.field === "description")) missingDescription++;
  }
  return {
    total,
    ready,
    withErrors,
    withWarnings,
    avgCompleteness: total ? Math.round(sum / total) : 0,
    missingImage,
    missingDescription,
    missingPrice,
  };
}

// Normaliza metadatos SEO de un producto sin llamar a IA.
// Rellena meta_title, meta_description, focus_keyword y tags cuando faltan
// o cuando exceden los límites recomendados, y reporta los cambios aplicados.

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "y", "o", "u", "un", "una", "unos", "unas",
  "para", "con", "sin", "por", "en", "del", "al", "a", "the", "of", "and",
  "for", "with", "to", "from", "by",
]);

const truncate = (s: string, max: number) => {
  if (!s) return s;
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
};

const stripHtml = (s: string) =>
  (s || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

const slugTokens = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));

export type SeoNormalizationResult = {
  patch: Record<string, any>;
  changes: string[]; // human-readable list of what changed
};

export function normalizeSeoMetadata(row: any): SeoNormalizationResult {
  const changes: string[] = [];
  const patch: Record<string, any> = {};

  const name = (row?.name || "").trim();
  const brand = (row?.brand || row?.brand_name || "").trim();
  const desc = stripHtml(row?.description || row?.short_description || row?.long_description_html || "");

  // meta_title: 30–60 chars
  const currentTitle = (row?.meta_title || "").trim();
  if (!currentTitle) {
    const base = brand ? `${name} - ${brand}` : name;
    if (base) {
      patch.meta_title = truncate(base, 60);
      changes.push(`meta_title generado (${patch.meta_title.length} car.)`);
    }
  } else if (currentTitle.length > 60) {
    patch.meta_title = truncate(currentTitle, 60);
    changes.push(`meta_title acortado a 60 car.`);
  }

  // meta_description: 80–160 chars
  const currentDesc = (row?.meta_description || "").trim();
  if (!currentDesc) {
    const base = desc || `${name}${brand ? ` de ${brand}` : ""}. Disponible en WAXAPP.`;
    if (base) {
      patch.meta_description = truncate(base, 160);
      changes.push(`meta_description generada (${patch.meta_description.length} car.)`);
    }
  } else if (currentDesc.length > 160) {
    patch.meta_description = truncate(currentDesc, 160);
    changes.push(`meta_description acortada a 160 car.`);
  } else if (currentDesc.length < 50 && desc && desc.length > currentDesc.length) {
    patch.meta_description = truncate(desc, 160);
    changes.push(`meta_description ampliada (era muy corta)`);
  }

  // focus_keyword
  const currentKw = (row?.focus_keyword || "").trim();
  if (!currentKw) {
    const tokens = slugTokens(name);
    if (tokens.length) {
      patch.focus_keyword = tokens.slice(0, 3).join(" ");
      changes.push(`focus_keyword: "${patch.focus_keyword}"`);
    }
  }

  // tags: array de strings, dedup, lowercase, max 10
  const rawTags = Array.isArray(row?.tags) ? row.tags : [];
  const cleanedTags = Array.from(
    new Set(
      rawTags
        .map((t: any) => String(t || "").trim().toLowerCase())
        .filter((t: string) => t && t.length >= 2 && t.length <= 30)
    )
  ).slice(0, 10);

  if (!rawTags.length) {
    const seed = [
      ...slugTokens(name).slice(0, 4),
      brand ? brand.toLowerCase() : null,
      row?.category ? String(row.category).toLowerCase() : null,
    ].filter(Boolean) as string[];
    const generated = Array.from(new Set(seed)).slice(0, 6);
    if (generated.length) {
      patch.tags = generated;
      changes.push(`tags generados (${generated.length})`);
    }
  } else if (
    cleanedTags.length !== rawTags.length ||
    cleanedTags.some((t, i) => t !== rawTags[i])
  ) {
    patch.tags = cleanedTags;
    changes.push(`tags normalizados (${cleanedTags.length})`);
  }

  return { patch, changes };
}

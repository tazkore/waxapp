/**
 * Plantillas de metadatos por categoría de producto.
 * Cada plantilla declara qué campos avanzados aplican y sugerencias de auto-fill.
 */

export type MetadataField =
  | "battery_mah"
  | "puffs_estimate"
  | "nicotine_mg"
  | "vaporizer_type"
  | "capacity_ml"
  | "pg_vg_ratio"
  | "thc_percentage"
  | "cbd_percentage"
  | "strain_type"
  | "terpenes"
  | "material"
  | "compatibility"
  | "warranty_months"
  | "country_of_origin"
  | "weight_grams"
  | "ingredients"
  | "flavor_profile"
  | "warnings"
  | "specifications";

export interface MetadataTemplate {
  slug: string;
  label: string;
  description: string;
  /** Campos relevantes a mostrar en el editor */
  fields: MetadataField[];
  /** Advertencias regulatorias sugeridas por defecto */
  defaultWarnings: string[];
  /** Sugerencias para auto-fill por IA */
  aiHints: string[];
}

export const METADATA_TEMPLATES: MetadataTemplate[] = [
  {
    slug: "vape_disposable",
    label: "Vaporizadores y desechables",
    description: "Cigarrillos electrónicos, pods, desechables, vapers recargables.",
    fields: [
      "battery_mah",
      "puffs_estimate",
      "nicotine_mg",
      "vaporizer_type",
      "capacity_ml",
      "flavor_profile",
      "warnings",
      "compatibility",
      "warranty_months",
      "country_of_origin",
      "weight_grams",
      "specifications",
    ],
    defaultWarnings: [
      "Producto exclusivo para mayores de 18 años",
      "Contiene nicotina, sustancia altamente adictiva",
      "Mantener fuera del alcance de niños y mascotas",
      "No recomendado para mujeres embarazadas o en lactancia",
    ],
    aiHints: [
      "Identifica mAh de batería, puffs estimados, mg de nicotina, tipo de evaporador (pod/desechable/cartucho), sabores y advertencias 18+/nicotina.",
    ],
  },
  {
    slug: "e_liquid",
    label: "E-líquidos y sales de nicotina",
    description: "Líquidos para vapeo, freebase, sales de nicotina, shortfills.",
    fields: [
      "capacity_ml",
      "nicotine_mg",
      "pg_vg_ratio",
      "flavor_profile",
      "ingredients",
      "warnings",
      "country_of_origin",
      "specifications",
    ],
    defaultWarnings: [
      "Producto exclusivo para mayores de 18 años",
      "Contiene nicotina, sustancia altamente adictiva",
      "No ingerir. En caso de contacto con ojos, lavar con agua abundante",
      "Conservar en lugar fresco y seco",
    ],
    aiHints: [
      "Detecta capacidad en mL, mg de nicotina, ratio PG/VG, perfil de sabor, ingredientes principales y advertencias.",
    ],
  },
  {
    slug: "flower_concentrate",
    label: "Flor y concentrados",
    description: "Flor seca, hash, resina, rosin, distillates, vape carts botánicos.",
    fields: [
      "thc_percentage",
      "cbd_percentage",
      "strain_type",
      "terpenes",
      "weight_grams",
      "country_of_origin",
      "warnings",
      "specifications",
    ],
    defaultWarnings: [
      "Producto exclusivo para mayores de 18 años",
      "No operar maquinaria pesada bajo los efectos del producto",
      "Mantener fuera del alcance de menores y mascotas",
      "Verificar legalidad en su jurisdicción antes de adquirir",
    ],
    aiHints: [
      "Identifica % de THC, % de CBD, tipo de cepa (sativa/indica/híbrida), terpenos predominantes, peso en gramos y advertencias.",
    ],
  },
  {
    slug: "accessory",
    label: "Accesorios y hardware",
    description: "Baterías, cargadores, atomizadores, grinders, papers, cables.",
    fields: [
      "material",
      "compatibility",
      "warranty_months",
      "country_of_origin",
      "weight_grams",
      "specifications",
    ],
    defaultWarnings: [
      "Producto exclusivo para mayores de 18 años",
      "Usar solamente con dispositivos compatibles indicados por el fabricante",
    ],
    aiHints: [
      "Detecta material principal, dispositivos compatibles, meses de garantía, dimensiones y peso.",
    ],
  },
];

export function getTemplate(slug?: string | null): MetadataTemplate | null {
  if (!slug) return null;
  return METADATA_TEMPLATES.find((t) => t.slug === slug) || null;
}

/** Sugerir plantilla automáticamente según la categoría/nombre del producto */
export function suggestTemplate(input: { category?: string | null; name?: string | null }): MetadataTemplate {
  const txt = `${input.category || ""} ${input.name || ""}`.toLowerCase();
  if (/(flor|flower|hash|resin|rosin|cepa|strain|cannab|thc|cbd|gramo)/i.test(txt)) {
    return METADATA_TEMPLATES[2];
  }
  if (/(liquido|líquido|liquid|e-?juice|sales?\s+nic|freebase)/i.test(txt)) {
    return METADATA_TEMPLATES[1];
  }
  if (/(accesori|cargador|charger|bater[ií]a\b|grinder|paper|cable|pyrex|coil|mecha)/i.test(txt)) {
    return METADATA_TEMPLATES[3];
  }
  // Default: vapeadores
  return METADATA_TEMPLATES[0];
}

export const VAPORIZER_TYPES = [
  { value: "disposable", label: "Desechable" },
  { value: "pod", label: "Pod" },
  { value: "cartridge", label: "Cartucho 510" },
  { value: "rechargeable", label: "Recargable" },
  { value: "dry_herb", label: "Hierba seca" },
  { value: "battery", label: "Batería" },
  { value: "mod", label: "Mod / Box" },
];

export const STRAIN_TYPES = [
  { value: "indica", label: "Indica" },
  { value: "sativa", label: "Sativa" },
  { value: "hybrid", label: "Híbrida" },
  { value: "ruderalis", label: "Ruderalis" },
  { value: "cbd_dominant", label: "CBD dominante" },
];

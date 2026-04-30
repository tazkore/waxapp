// Catálogo de campos requeridos.
// El schema vive en la columna `integrations.credential_schema` (jsonb).
// Si una app no tiene schema definido en DB, se usa el fallback estático aquí.

export interface CatalogField {
  key: string;
  label: string;
  type?: 'text' | 'password';
  placeholder?: string;
  helper?: string;
  required?: boolean;
}

export interface CatalogEntry {
  fields: CatalogField[];
}

// Fallback estático mínimo (solo si la fila en DB no trae credential_schema)
const fallback: Record<string, CatalogEntry> = {
  skydropx: { fields: [{ key: 'api_key', label: 'API Key', type: 'password', required: true }] },
  meta_pixel: { fields: [{ key: 'pixel_id', label: 'Pixel ID', type: 'text', required: true }] },
};

export function getCatalog(slug: string, schema?: unknown): CatalogEntry {
  if (Array.isArray(schema) && schema.length > 0) {
    return { fields: schema as CatalogField[] };
  }
  return fallback[slug] ?? { fields: [{ key: 'api_key', label: 'API Key', type: 'password', required: true }] };
}

export const DISPLAY_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'envios', label: 'Envíos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'facturacion', label: 'Facturación' },
  { value: 'soporte', label: 'Servicio al Cliente' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'other', label: 'Otros' },
];

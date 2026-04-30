// Catálogo de campos requeridos por slug para el modal "Conectar [App]".
// Si un slug no aparece aquí, el modal usa un único campo `api_key`.

export interface CatalogField {
  key: string;
  label: string;
  type?: 'text' | 'password';
  placeholder?: string;
  helper?: string;
}

export interface CatalogEntry {
  fields: CatalogField[];
  docsLabel?: string;
}

export const integrationsCatalog: Record<string, CatalogEntry> = {
  skydropx: {
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk_live_...' }],
  },
  t1envios: {
    fields: [{ key: 'api_key', label: 'API Key', type: 'password' }],
  },
  ml_envios: {
    fields: [{ key: 'access_token', label: 'Access Token', type: 'password' }],
  },
  facturama: {
    fields: [
      { key: 'api_user', label: 'Usuario API' },
      { key: 'api_password', label: 'Contraseña API', type: 'password' },
    ],
  },
  factura_com: {
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
      { key: 'secret_key', label: 'Secret Key', type: 'password' },
    ],
  },
  meta_pixel: {
    fields: [{ key: 'pixel_id', label: 'Pixel ID', placeholder: '1234567890123456', helper: 'Solo números (15-16 dígitos).' }],
  },
  google_ads: {
    fields: [
      { key: 'conversion_id', label: 'Conversion ID', placeholder: 'AW-123456789' },
      { key: 'label', label: 'Conversion Label' },
    ],
  },
  tiktok_pixel: {
    fields: [{ key: 'pixel_id', label: 'Pixel ID' }],
  },
  klaviyo: {
    fields: [{ key: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'pk_...' }],
  },
  whatsapp_api: {
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID' },
      { key: 'access_token', label: 'Access Token', type: 'password' },
    ],
  },
  zendesk: {
    fields: [
      { key: 'subdomain', label: 'Subdominio', placeholder: 'tutienda' },
      { key: 'api_token', label: 'API Token', type: 'password' },
    ],
  },
  crisp: {
    fields: [{ key: 'website_id', label: 'Website ID' }],
  },
};

export const DISPLAY_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'envios', label: 'Envíos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'facturacion', label: 'Facturación' },
  { value: 'soporte', label: 'Servicio al Cliente' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'other', label: 'Otros' },
];

export function getCatalog(slug: string): CatalogEntry {
  return integrationsCatalog[slug] ?? { fields: [{ key: 'api_key', label: 'API Key', type: 'password' }] };
}

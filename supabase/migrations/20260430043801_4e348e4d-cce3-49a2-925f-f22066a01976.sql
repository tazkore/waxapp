-- Catálogo de integraciones data-driven
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS credential_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.integrations.credential_schema IS
  'Array de campos: [{key,label,type:text|password,placeholder,helper,required}]';
COMMENT ON COLUMN public.integrations.validation IS
  'Reglas de validación. Ejemplos:
   {"kind":"none"}
   {"kind":"regex","field":"pixel_id","pattern":"^\\d{10,17}$","message":"Pixel inválido"}
   {"kind":"http","method":"GET","url":"https://api.x.com/me","auth":{"type":"bearer","field":"api_key"}}
   auth.type: bearer|basic|token|header  con field/header_name según corresponda.';

-- Backfill credential_schema para apps existentes que aún no lo tengan
UPDATE public.integrations SET credential_schema = '[
  {"key":"api_key","label":"API Key","type":"password","required":true,"placeholder":"sk_live_..."}
]'::jsonb WHERE slug = 'skydropx' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"api_key","label":"API Key","type":"password","required":true}
]'::jsonb WHERE slug = 't1envios' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"access_token","label":"Access Token","type":"password","required":true}
]'::jsonb WHERE slug = 'ml_envios' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"api_user","label":"Usuario API","type":"text","required":true},
  {"key":"api_password","label":"Contraseña API","type":"password","required":true}
]'::jsonb WHERE slug = 'facturama' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"api_key","label":"API Key","type":"password","required":true},
  {"key":"secret_key","label":"Secret Key","type":"password","required":true}
]'::jsonb WHERE slug = 'factura_com' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET
  credential_schema = '[{"key":"pixel_id","label":"Pixel ID","type":"text","required":true,"placeholder":"1234567890123456","helper":"Solo números (10-17 dígitos)."}]'::jsonb,
  validation = '{"kind":"regex","field":"pixel_id","pattern":"^\\d{10,17}$","message":"Pixel ID inválido"}'::jsonb
WHERE slug IN ('meta_pixel','tiktok_pixel') AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"conversion_id","label":"Conversion ID","type":"text","required":true,"placeholder":"AW-123456789"},
  {"key":"label","label":"Conversion Label","type":"text","required":true}
]'::jsonb WHERE slug = 'google_ads' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"api_key","label":"Private API Key","type":"password","required":true,"placeholder":"pk_..."}
]'::jsonb WHERE slug = 'klaviyo' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"phone_number_id","label":"Phone Number ID","type":"text","required":true},
  {"key":"access_token","label":"Access Token","type":"password","required":true}
]'::jsonb WHERE slug = 'whatsapp_api' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET credential_schema = '[
  {"key":"subdomain","label":"Subdominio","type":"text","required":true,"placeholder":"tutienda"},
  {"key":"api_token","label":"API Token","type":"password","required":true}
]'::jsonb WHERE slug = 'zendesk' AND credential_schema = '[]'::jsonb;

UPDATE public.integrations SET
  credential_schema = '[{"key":"website_id","label":"Website ID","type":"text","required":true}]'::jsonb,
  validation = '{"kind":"regex","field":"website_id","pattern":"^[0-9a-f-]{20,}$","message":"Website ID inválido"}'::jsonb
WHERE slug = 'crisp' AND credential_schema = '[]'::jsonb;
INSERT INTO public.integrations (slug, name, description, category, version, is_installed, is_active, config, api_docs_url) VALUES
('skydropx','Skydropx','Automatiza tus guías de envío en todo México con la mejor cobertura.','envios','1.0',false,false,'{}'::jsonb,'https://docs.skydropx.com'),
('t1envios','T1 Envíos','Cotiza y genera guías con múltiples paqueterías mexicanas.','envios','1.0',false,false,'{}'::jsonb,'https://t1envios.com/api'),
('ml_envios','Mercado Envíos','Sincroniza envíos con la red logística de Mercado Libre.','envios','1.0',false,false,'{}'::jsonb,'https://developers.mercadolibre.com.mx/'),
('facturama','Facturama CFDI 4.0','Emisión automática de facturas CFDI 4.0 al SAT.','facturacion','1.0',false,false,'{}'::jsonb,'https://apisandbox.facturama.mx/docs'),
('factura_com','Factura.com','Facturación electrónica y complemento de pagos para México.','facturacion','1.0',false,false,'{}'::jsonb,'https://factura.com/apidocs'),
('meta_pixel','Meta Pixel','Trackea conversiones y crea audiencias de Facebook & Instagram Ads.','marketing','1.0',false,false,'{}'::jsonb,'https://developers.facebook.com/docs/meta-pixel'),
('google_ads','Google Ads Conversion','Mide conversiones de campañas de Google Ads en tu checkout.','marketing','1.0',false,false,'{}'::jsonb,'https://support.google.com/google-ads/answer/6095821'),
('tiktok_pixel','TikTok Pixel','Optimiza campañas de TikTok Ads con eventos de compra.','marketing','1.0',false,false,'{}'::jsonb,'https://ads.tiktok.com/help/article/get-started-pixel'),
('klaviyo','Klaviyo','Email marketing automatizado con segmentación avanzada.','marketing','1.0',false,false,'{}'::jsonb,'https://developers.klaviyo.com/'),
('whatsapp_api','WhatsApp Business API','Envía notificaciones transaccionales por WhatsApp.','soporte','1.0',false,false,'{}'::jsonb,'https://developers.facebook.com/docs/whatsapp'),
('zendesk','Zendesk','Centraliza tickets de soporte de tus clientes.','soporte','1.0',false,false,'{}'::jsonb,'https://developer.zendesk.com/'),
('crisp','Crisp Chat','Chat en vivo en tu tienda con bot integrado.','soporte','1.0',false,false,'{}'::jsonb,'https://docs.crisp.chat/')
ON CONFLICT (slug) DO NOTHING;
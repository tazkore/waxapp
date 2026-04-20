-- Seed open-source / public-API marketplaces & app stores into integrations catalog
INSERT INTO public.integrations (name, slug, description, category, api_docs_url, version, is_installed, is_active, config) VALUES
  ('MercadoLibre', 'mercadolibre', 'Marketplace #1 de Latinoamérica. Sincroniza productos, stock y pedidos vía API REST pública.', 'marketplace', 'https://developers.mercadolibre.com.mx/', '1.0.0', false, false, '{}'::jsonb),
  ('Amazon Seller', 'amazon-sp-api', 'Vende en Amazon México y administra inventario con la Selling Partner API (SP-API) oficial.', 'marketplace', 'https://developer-docs.amazon.com/sp-api/', '1.0.0', false, false, '{}'::jsonb),
  ('Shopify Admin', 'shopify-admin', 'Sincroniza tu catálogo con tiendas Shopify externas mediante la Admin API REST/GraphQL.', 'marketplace', 'https://shopify.dev/docs/api/admin', '1.0.0', false, false, '{}'::jsonb),
  ('WooCommerce', 'woocommerce', 'Plugin open-source de WordPress. Conecta tiendas WooCommerce vía REST API.', 'marketplace', 'https://woocommerce.github.io/woocommerce-rest-api-docs/', '1.0.0', false, false, '{}'::jsonb),
  ('PrestaShop', 'prestashop', 'Plataforma e-commerce open-source. Webservice API para sincronizar productos y pedidos.', 'marketplace', 'https://devdocs.prestashop-project.org/8/webservice/', '1.0.0', false, false, '{}'::jsonb),
  ('Magento / Adobe Commerce', 'magento', 'Plataforma open-source empresarial. REST y GraphQL API para integración total.', 'marketplace', 'https://developer.adobe.com/commerce/webapi/rest/', '1.0.0', false, false, '{}'::jsonb),
  ('Medusa', 'medusa', 'Headless commerce open-source basado en Node.js. Backend modular y extensible.', 'marketplace', 'https://docs.medusajs.com/', '1.0.0', false, false, '{}'::jsonb),
  ('Saleor', 'saleor', 'Plataforma open-source GraphQL-first para comercio composable y headless.', 'marketplace', 'https://docs.saleor.io/', '1.0.0', false, false, '{}'::jsonb),
  ('Vendure', 'vendure', 'Framework open-source TypeScript headless para tiendas B2C y B2B.', 'marketplace', 'https://docs.vendure.io/', '1.0.0', false, false, '{}'::jsonb),
  ('Sylius', 'sylius', 'Plataforma open-source basada en Symfony, ideal para tiendas customizables B2B.', 'marketplace', 'https://docs.sylius.com/', '1.0.0', false, false, '{}'::jsonb),
  ('Spree Commerce', 'spree', 'E-commerce open-source en Ruby on Rails con API REST completa.', 'marketplace', 'https://api.spreecommerce.org/', '1.0.0', false, false, '{}'::jsonb),
  ('Bagisto', 'bagisto', 'Plataforma open-source en Laravel para tiendas multi-canal con GraphQL API.', 'marketplace', 'https://devdocs.bagisto.com/', '1.0.0', false, false, '{}'::jsonb),
  ('OpenCart', 'opencart', 'CMS de tienda online open-source con API REST/JSON para integración.', 'marketplace', 'https://docs.opencart.com/', '1.0.0', false, false, '{}'::jsonb),
  ('Etsy', 'etsy', 'Marketplace global para productos artesanales y únicos. Open API v3.', 'marketplace', 'https://developers.etsy.com/documentation/', '1.0.0', false, false, '{}'::jsonb),
  ('eBay', 'ebay', 'Marketplace internacional con APIs RESTful para listings, órdenes e inventario.', 'marketplace', 'https://developer.ebay.com/api-docs/static/rest-request-components.html', '1.0.0', false, false, '{}'::jsonb),
  ('Walmart Marketplace', 'walmart', 'Vende en Walmart con APIs públicas para gestión de items, órdenes y precios.', 'marketplace', 'https://developer.walmart.com/home/us-mp', '1.0.0', false, false, '{}'::jsonb),
  ('Facebook & Instagram Shops', 'meta-shops', 'Sincroniza catálogo con Facebook Shops e Instagram via Meta Commerce API.', 'marketplace', 'https://developers.facebook.com/docs/commerce-platform/', '1.0.0', false, false, '{}'::jsonb),
  ('TikTok Shop', 'tiktok-shop', 'Vende dentro de TikTok con la Shop Open Platform API.', 'marketplace', 'https://partner.tiktokshop.com/docv2/page/home', '1.0.0', false, false, '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
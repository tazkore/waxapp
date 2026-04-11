import { useEffect } from 'react';

interface ProductJsonLdProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
  image?: string;
  sku?: string;
  url?: string;
  availability?: 'InStock' | 'OutOfStock';
  brand?: string;
}

const ProductJsonLd = ({ name, description, price, currency = 'MXN', image, sku, url, availability = 'InStock', brand = 'WAXAPP' }: ProductJsonLdProps) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: image || undefined,
      sku: sku || undefined,
      url: url || window.location.href,
      brand: { '@type': 'Brand', name: brand },
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: currency,
        availability: `https://schema.org/${availability}`,
        url: url || window.location.href,
      },
    });
    // Remove previous
    document.getElementById('product-jsonld')?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [name, description, price, currency, image, sku, url, availability, brand]);

  return null;
};

export default ProductJsonLd;

export interface Producto {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  onSale: boolean;
  image: string;
  images: string[];
  description: string;
  stock: number;
  seoTitle: string;
  category: string;
  hits?: string;
}

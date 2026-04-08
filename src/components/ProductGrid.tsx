import { products } from '@/data/products';
import ProductCard from './ProductCard';

const ProductGrid = () => (
  <section id="tienda" className="py-20">
    <div className="container mx-auto px-4">
      <h2 className="mb-10 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
        Nuestra Colección
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  </section>
);

export default ProductGrid;

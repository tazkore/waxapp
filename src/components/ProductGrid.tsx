import { useState } from 'react';
import { motion } from 'framer-motion';
import { products } from '@/data/products';
import ProductCard from './ProductCard';

const categories = ['Todos', 'Nano-Tech', 'Comestibles', 'Hardware'];

const ProductGrid = () => {
  const [active, setActive] = useState('Todos');
  const filtered = active === 'Todos' ? products : products.filter((p) => p.category === active);

  return (
    <section id="tienda" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Nuestra Colección
        </h2>
        <p className="mb-8 text-center text-muted-foreground max-w-lg mx-auto">
          Productos premium con la más alta calidad y tecnología de punta.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProductGrid;

import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product, useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  'Nano-Tech': 'text-primary',
  Comestibles: 'text-secondary',
  Hardware: 'text-foreground',
};

const ProductCard = ({ product }: { product: Product }) => {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.title} agregado al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/30"
    >
      <div className="relative flex h-52 items-center justify-center bg-muted">
        <span className="font-display text-lg text-muted-foreground/40">WAXAPP</span>
        {product.badge && (
          <span className="absolute right-3 top-3 rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground amber-glow">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className={`text-xs font-semibold uppercase tracking-wider ${categoryColors[product.category] ?? 'text-muted-foreground'}`}>
          {product.category}
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">{product.title}</h3>
        <span className="mt-auto text-xl font-bold text-foreground">
          ${product.price.toLocaleString()} <span className="text-sm text-muted-foreground">MXN</span>
        </span>
        <button
          onClick={handleAdd}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground transition-all hover:neon-glow hover:brightness-110"
        >
          <ShoppingCart className="h-4 w-4" /> Agregar al Carrito
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;

import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product, useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  'Nano-Tech': 'text-primary',
  Comestibles: 'text-secondary',
  Hardware: 'text-foreground',
};

const ProductCard = ({ product, outOfStock = false }: { product: Product; outOfStock?: boolean }) => {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product);
    toast.success(`${product.title} agregado al carrito`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors ${
        outOfStock ? 'border-border/50 opacity-70' : 'border-border hover:border-primary/30'
      }`}
    >
      <Link to={`/producto/${product.id}`} className="flex flex-col flex-1">
        <div className="relative flex h-52 items-center justify-center bg-muted">
          <span className="font-display text-lg text-muted-foreground/40">WAXAPP</span>
          {product.badge && !outOfStock && (
            <span className="absolute right-3 top-3 rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground amber-glow">
              {product.badge}
            </span>
          )}
          {outOfStock && (
            <span className="absolute right-3 top-3 rounded-md bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
              Agotado
            </span>
          )}
          {!outOfStock && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <Eye className="h-4 w-4" /> Ver Detalle
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className={`text-xs font-semibold uppercase tracking-wider ${categoryColors[product.category] ?? 'text-muted-foreground'}`}>
            {product.category}
          </span>
          <h3 className="font-display text-lg font-semibold text-foreground">{product.title}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          )}
          <span className="mt-auto text-xl font-bold text-foreground">
            ${product.price.toLocaleString()} <span className="text-sm text-muted-foreground">MXN</span>
          </span>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold transition-all ${
            outOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:brightness-110'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? 'Agotado' : 'Agregar al Carrito'}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;

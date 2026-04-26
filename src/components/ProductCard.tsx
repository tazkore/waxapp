import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product, useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import QuickViewDialog from './QuickViewDialog';

const categoryColors: Record<string, string> = {
  'Nano-Tech': 'text-primary',
  Comestibles: 'text-secondary',
  Hardware: 'text-foreground',
};

interface ProductCardProps {
  product: Product & { image_url?: string | null };
  outOfStock?: boolean;
}

const ProductCard = ({ product, outOfStock = false }: ProductCardProps) => {
  const addItem = useCartStore((s) => s.addItem);
  const [quickOpen, setQuickOpen] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product);
    toast.success(`${product.title} agregado al carrito`);
  };

  const openQuick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickOpen(true);
  };

  const img = product.image_url;

  return (
    <>
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
          <div className="relative h-52 overflow-hidden bg-muted flex items-center justify-center">
            {img ? (
              <img
                src={img}
                alt={product.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <span className="font-display text-lg text-muted-foreground/40">WAXAPP</span>
            )}
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={openQuick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/90 backdrop-blur text-foreground text-xs font-medium hover:bg-background transition"
                >
                  <Eye className="h-3.5 w-3.5" /> Vista rápida
                </button>
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
      <QuickViewDialog product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
};

export default ProductCard;

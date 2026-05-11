import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye, ImageOff, Zap } from 'lucide-react';
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
  product: Product & { image_url?: string | null; compare_at_price?: number | null };
  outOfStock?: boolean;
}

const ProductCard = ({ product, outOfStock = false }: ProductCardProps) => {
  const addItem = useCartStore((s) => s.addItem);
  const [quickOpen, setQuickOpen] = useState(false);

  const hasVariants = (product.variants?.length ?? 0) > 0;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAdd = (e: React.MouseEvent) => {
    stop(e);
    if (outOfStock) return;
    if (hasVariants) {
      setQuickOpen(true);
      return;
    }
    addItem(product);
    toast.success(`${product.title} agregado al carrito`);
  };

  const openQuick = (e: React.MouseEvent) => {
    stop(e);
    setQuickOpen(true);
  };

  const img = product.image_url;
  const hasOffer = product.compare_at_price != null && product.compare_at_price > product.price;

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
        <Link to={`/producto/${product.id}`} className="flex flex-col flex-1" aria-label={`Ver ${product.title}`}>
          <div className="relative h-52 overflow-hidden bg-muted flex items-center justify-center">
            {img ? (
              <img
                src={img}
                alt={product.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: '#1A1A1A',
                  boxShadow: 'inset 0 0 0 1px rgba(0,230,118,0.35), inset 0 0 24px rgba(0,230,118,0.18)',
                }}
              >
                <ImageOff className="h-10 w-10" style={{ color: '#00E676' }} aria-hidden />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: '#00E676' }}>
                  Sin imagen
                </span>
              </div>
            )}

            {/* Stock badge top-left */}
            {outOfStock ? (
              <span className="absolute left-3 top-3 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
                Agotado
              </span>
            ) : (
              <span
                className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
                style={{ backgroundColor: '#00E676', boxShadow: '0 0 12px rgba(0,230,118,0.45)' }}
              >
                En Stock
              </span>
            )}

            {hasOffer && !outOfStock && (
              <span
                className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-bold text-black shadow-md"
                style={{ backgroundColor: '#FFB300', boxShadow: '0 0 12px rgba(255,179,0,0.5)' }}
              >
                Oferta
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
            {/* Availability line */}
            {!outOfStock && (
              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#FFB300' }}>
                <Zap className="h-3 w-3" /> Disponibilidad inmediata
              </span>
            )}

            <span className={`text-xs font-semibold uppercase tracking-wider ${categoryColors[product.category] ?? 'text-muted-foreground'}`}>
              {product.category}
            </span>
            <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2">{product.title}</h3>

            <div className="flex items-baseline gap-2">
              <span
                className="text-xl font-bold"
                style={hasOffer ? { color: '#FFB300' } : undefined}
              >
                ${product.price.toLocaleString()}
              </span>
              {hasOffer && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.compare_at_price!.toLocaleString()}
                </span>
              )}
              <span className="text-sm text-muted-foreground">MXN</span>
            </div>

            {product.description && (
              <p className="mt-auto text-xs text-muted-foreground line-clamp-2">{product.description}</p>
            )}
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

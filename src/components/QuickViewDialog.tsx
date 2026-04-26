import { useState, useRef, MouseEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShoppingCart, X } from 'lucide-react';
import { Product, useCartStore } from '@/store/cartStore';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface QuickViewDialogProps {
  product: Product & { image_url?: string | null };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const QuickViewDialog = ({ product, open, onOpenChange }: QuickViewDialogProps) => {
  const addItem = useCartStore((s) => s.addItem);
  const [variant, setVariant] = useState<string | undefined>(product.variants?.[0]?.name);
  const imgRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ active: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const currentPrice = product.variants?.find((v) => v.name === variant)?.price ?? product.price;
  const img = (product as any).image_url;

  const add = () => {
    addItem(product, 1, variant);
    toast.success(`${product.title} agregado al carrito`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
        <button onClick={() => onOpenChange(false)} className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 hover:bg-background"><X className="h-4 w-4" /></button>
        <div className="grid md:grid-cols-2">
          <div
            ref={imgRef}
            className="aspect-square bg-muted overflow-hidden relative"
            onMouseEnter={() => setZoom({ ...zoom, active: true })}
            onMouseLeave={() => setZoom({ ...zoom, active: false })}
            onMouseMove={onMove}
          >
            {img ? (
              <img
                src={img}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  transform: zoom.active ? 'scale(1.8)' : 'scale(1)',
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-3xl text-muted-foreground/40">WAXAPP</div>
            )}
          </div>
          <div className="p-6 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{product.category}</span>
            <h2 className="font-display text-2xl font-bold text-foreground mt-1">{product.title}</h2>
            {product.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{product.description}</p>}
            <div className="text-2xl font-bold text-foreground mt-4">${currentPrice.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">MXN</span></div>

            {product.variants && product.variants.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Variante</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setVariant(v.name)}
                      className={`px-3 py-1.5 rounded-md text-xs border transition ${
                        variant === v.name ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/30'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 space-y-2">
              <button onClick={add} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:brightness-110 transition">
                <ShoppingCart className="h-4 w-4" /> Agregar al carrito
              </button>
              <Link to={`/producto/${product.id}`} onClick={() => onOpenChange(false)} className="block text-center text-xs text-muted-foreground hover:text-primary transition">
                Ver página completa →
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewDialog;

import { useState, useRef, MouseEvent, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShoppingCart, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const [variant, setVariant] = useState<string | undefined>(product.variants?.[0]?.name);
  const imgRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  useEffect(() => {
    if (open) setVariant(product.variants?.[0]?.name);
  }, [open, product.id]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ active: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const currentPrice = product.variants?.find((v) => v.name === variant)?.price ?? product.price;
  const img = (product as any).image_url;

  const benefitsList = (product.benefits ?? '')
    .split(/[,\n;•·]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && /[a-záéíóúñ]/i.test(s))
    .slice(0, 5);

  const add = () => {
    if (hasVariants && !variant) {
      toast.error('Selecciona una variante');
      return;
    }
    addItem(product, 1, variant);
    toast.custom(
      (t) => (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          style={{
            backgroundColor: '#0A0A0A',
            border: '1px solid rgba(0,230,118,0.5)',
            boxShadow: '0 0 24px rgba(0,230,118,0.35)',
            color: '#fff',
            minWidth: 280,
          }}
          onClick={() => toast.dismiss(t)}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,230,118,0.18)' }}
          >
            <Check className="h-4 w-4" style={{ color: '#00E676' }} strokeWidth={3} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Agregado al carrito exitosamente</p>
            <p className="text-xs text-white/60">
              {product.title}{variant ? ` · ${variant}` : ''}
            </p>
          </div>
        </motion.div>
      ),
      { duration: 2400 }
    );
    onOpenChange(false);
    setTimeout(() => setCartOpen(true), 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden bg-card border-border"
        aria-describedby="quickview-desc"
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 hover:bg-background"
          aria-label="Cerrar vista rápida del producto"
        ><X className="h-4 w-4" /></button>
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
          <div className="p-6 flex flex-col max-h-[80vh] overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{product.category}</span>
            <h2 className="font-display text-2xl font-bold text-foreground mt-1">{product.title}</h2>
            {product.description && <p id="quickview-desc" className="text-sm text-muted-foreground mt-2">{product.description}</p>}
            <div className="text-2xl font-bold text-foreground mt-4">${currentPrice.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">MXN</span></div>

            {hasVariants && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Variante {variant ? '' : <span className="text-destructive">*</span>}</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants!.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setVariant(v.name)}
                      aria-label={`Seleccionar variante ${v.name}`}
                      aria-pressed={variant === v.name}
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

            {benefitsList.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Beneficios</p>
                <ul className="space-y-1.5">
                  {benefitsList.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#00E676' }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto pt-6 space-y-2">
              <button
                onClick={add}
                disabled={hasVariants && !variant}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
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

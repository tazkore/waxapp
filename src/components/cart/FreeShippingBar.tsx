import { Progress } from '@/components/ui/progress';
import { Truck } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD } from '@/store/cartStore';

interface Props {
  subtotalAfterDiscounts: number;
}

const FreeShippingBar = ({ subtotalAfterDiscounts }: Props) => {
  const reached = subtotalAfterDiscounts >= FREE_SHIPPING_THRESHOLD;
  const pct = Math.min(100, Math.round((subtotalAfterDiscounts / FREE_SHIPPING_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalAfterDiscounts);

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2 text-xs">
        <Truck className={`h-3.5 w-3.5 ${reached ? 'text-primary' : 'text-muted-foreground'}`} />
        {reached ? (
          <span className="font-semibold text-primary">¡Felicidades! Tienes Envío Gratis 🎉</span>
        ) : (
          <span className="text-muted-foreground">
            Te faltan{' '}
            <span className="font-semibold text-primary">${remaining.toLocaleString()} MXN</span>{' '}
            para Envío Gratis
          </span>
        )}
      </div>
      <Progress
        value={pct}
        className={`mt-2 h-1.5 ${reached ? 'neon-glow' : ''}`}
        aria-label="Progreso para envío gratis"
      />
    </div>
  );
};

export default FreeShippingBar;

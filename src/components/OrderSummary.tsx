import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Tag, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCartStore, FREE_SHIPPING_THRESHOLD } from '@/store/cartStore';
import { toast } from 'sonner';

interface Props {
  showCoupon?: boolean;
  compact?: boolean;
}

const OrderSummary = ({ showCoupon = true, compact = false }: Props) => {
  const {
    subtotal,
    shippingCost,
    total,
    discountCode,
    discountAmount,
    discountError,
    discountLoading,
    loyaltyPointsApplied,
    applyDiscount,
    clearDiscount,
  } = useCartStore();

  const [code, setCode] = useState('');
  const sub = subtotal();
  const ship = shippingCost();
  const grand = total();
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - (sub - discountAmount - (loyaltyPointsApplied || 0)));
  const pointsToEarn = Math.floor(grand / 10);

  const handleApply = async () => {
    if (!code.trim()) return;
    const ok = await applyDiscount(code);
    if (ok) {
      toast.success(`Cupón aplicado: ${code.toUpperCase()}`);
      setCode('');
    } else {
      toast.error(useCartStore.getState().discountError || 'Código inválido');
    }
  };

  const handleClear = () => {
    clearDiscount();
    toast.message('Cupón eliminado');
  };

  return (
    <div className={`space-y-3 ${compact ? 'text-sm' : ''}`}>
      {showCoupon && (
        <div className="space-y-2">
          {discountCode ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
              <div className="flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" />
                <span className="text-sm font-semibold">{discountCode}</span>
                <span className="text-xs text-muted-foreground">aplicado</span>
              </div>
              <button
                onClick={handleClear}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Quitar cupón"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Código de descuento"
                  className="bg-muted border-border uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <Button
                  type="button"
                  onClick={handleApply}
                  disabled={discountLoading || !code.trim()}
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  {discountLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
              {discountError && (
                <p className="text-xs text-destructive">{discountError}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <motion.span
            key={sub}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="font-medium text-foreground"
          >
            ${sub.toLocaleString()} MXN
          </motion.span>
        </div>

        {discountAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between text-primary"
          >
            <span>Descuento {discountCode ? `(${discountCode})` : ''}</span>
            <span className="font-medium">−${discountAmount.toLocaleString()} MXN</span>
          </motion.div>
        )}

        <div className="flex justify-between text-muted-foreground">
          <span>Envío</span>
          <motion.span
            key={ship}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className={ship === 0 ? 'font-medium text-primary' : 'font-medium text-foreground'}
          >
            {ship === 0 ? 'Gratis' : `$${ship.toLocaleString()} MXN`}
          </motion.span>
        </div>

        {ship > 0 && remainingForFree > 0 && (
          <p className="text-[11px] text-muted-foreground/80">
            Te faltan{' '}
            <span className="font-semibold text-primary">${remainingForFree.toLocaleString()} MXN</span>{' '}
            para envío gratis.
          </p>
        )}

        <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
          <span>Total</span>
          <motion.span
            key={grand}
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            ${grand.toLocaleString()} MXN
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;

import { Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatMXN } from "@/lib/utils";
import { useCartStore, FREE_SHIPPING_THRESHOLD } from "@/store/cartStore";

export function FreeShippingBar() {
  const subtotal = useCartStore((s) => s.subtotal());
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="px-6 py-3 bg-secondary/40 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Truck className="h-3.5 w-3.5 text-primary" />
        {remaining > 0 ? (
          <span>
            Agrega <span className="text-foreground font-semibold">{formatMXN(remaining)}</span> más
            para <span className="text-primary font-semibold">envío gratis</span>
          </span>
        ) : (
          <span className="text-primary font-semibold">¡Tienes envío gratis!</span>
        )}
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

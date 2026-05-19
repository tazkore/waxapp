import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  email?: string;
}

const LoyaltyRedeemCard = ({ email }: Props) => {
  const { loyaltyPointsApplied, setLoyaltyPoints, clearLoyaltyPoints, subtotal, discountAmount } = useCartStore();
  const [balance, setBalance] = useState(0);
  const [enabled, setEnabled] = useState(loyaltyPointsApplied > 0);
  const [input, setInput] = useState(loyaltyPointsApplied || 0);

  const sub = subtotal();
  const max = Math.max(0, Math.min(balance, sub - (discountAmount || 0)));

  useEffect(() => {
    if (!email) return;
    supabase
      .from('customer_profiles')
      .select('loyalty_points')
      .eq('email', email.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        setBalance(Number(data?.loyalty_points ?? 0));
      });
  }, [email]);

  const handleToggle = (on: boolean) => {
    setEnabled(on);
    if (!on) {
      clearLoyaltyPoints();
      setInput(0);
    } else if (input > 0) {
      setLoyaltyPoints(Math.min(input, max));
    }
  };

  const handleApply = () => {
    const v = Math.min(Math.max(0, Math.floor(input || 0)), max);
    setInput(v);
    setLoyaltyPoints(v);
  };

  const handleMax = () => {
    setInput(max);
    setLoyaltyPoints(max);
  };

  if (balance <= 0) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Tus WAX Points</span>
          <span className="text-primary font-bold">{balance.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="loyalty-toggle" className="text-xs text-muted-foreground">Usar</Label>
          <Switch id="loyalty-toggle" checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {enabled && (
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={max}
            value={input}
            onChange={(e) => setInput(Number(e.target.value))}
            onBlur={handleApply}
            className="bg-muted border-border h-9"
            placeholder="0"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMax}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            Máx ({max})
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        1 punto = $1 MXN. Máximo aplicable: ${max.toLocaleString()} MXN.
      </p>
    </div>
  );
};

export default LoyaltyRedeemCard;

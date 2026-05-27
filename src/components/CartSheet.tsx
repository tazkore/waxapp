import { useState, useEffect } from "react";
import { Minus, Plus, Trash2, Tag, Star, ShoppingBag, X, ArrowRight, Gift, Zap, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FreeShippingBar } from "@/components/FreeShippingBar";
import { useCartStore } from "@/store/cartStore";
import { formatMXN } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CartSheet() {
  const {
    isOpen, setCartOpen, items, removeItem, updateQuantity,
    subtotal, shippingCost, total,
    discountCode, discountAmount, discountLoading, applyDiscount, clearDiscount,
    loyaltyPointsApplied, setLoyaltyPoints, clearLoyaltyPoints,
    tieredDiscount, tieredDiscountPct, extras, extrasAmount, setExtras, nextTierInfo,
  } = useCartStore();

  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [userPoints, setUserPoints] = useState<number | null>(null);

  // Load loyalty points from Supabase if user is logged in
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("customer_profiles")
        .select("loyalty_points")
        .eq("email", user.email)
        .maybeSingle();
      if (data?.loyalty_points != null) setUserPoints(data.loyalty_points);
    })();
  }, [isOpen]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const ok = await applyDiscount(code);
    if (ok) {
      toast.success(`Cupón ${code} aplicado`);
      setCouponInput("");
    } else {
      toast.error("Cupón inválido o expirado.");
    }
  };

  const handleRedeemPoints = () => {
    const pts = parseInt(pointsInput, 10) || 0;
    if (!userPoints || pts > userPoints) {
      toast.error(`Solo tienes ${userPoints ?? 0} WAX Points disponibles.`);
      return;
    }
    setLoyaltyPoints(pts);
    toast.success(`Aplicando ${pts} WAX Points (−${formatMXN(pts)})`);
    setPointsInput("");
  };

  const waxPointsToEarn = Math.floor(subtotal() / 10);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Tiered discount progress bar
  const sub = subtotal();
  const nextTier = nextTierInfo();
  const TIERS_ALL = [
    { min: 1000, pct: 5 },
    { min: 2000, pct: 10 },
    { min: 3500, pct: 15 },
  ];
  const currentTierIdx = TIERS_ALL.reduce((idx, t, i) => (sub >= t.min ? i : idx), -1);
  const prevTierMin = currentTierIdx >= 0 ? TIERS_ALL[currentTierIdx].min : 0;
  const nextTierMin = nextTier ? nextTier.threshold : TIERS_ALL[TIERS_ALL.length - 1].min;
  const progressRange = nextTierMin - prevTierMin;
  const progressVal = Math.min(sub - prevTierMin, progressRange);
  const progressPct = progressRange > 0 ? Math.round((progressVal / progressRange) * 100) : 100;

  const extrasTotal = extrasAmount();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => setCartOpen(open)}>
      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-sm bg-card border-border">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Carrito
            {itemCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 rounded-full">
                {itemCount}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Free shipping bar */}
        <FreeShippingBar />

        {/* Tiered Discount Progress Bar */}
        {items.length > 0 && (
          <div className="px-5 py-2 space-y-1.5 border-b border-border/30 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] font-semibold text-foreground">Descuento por volumen</span>
              </div>
              {tieredDiscountPct > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30"
                >
                  <span className="text-[10px] text-emerald-500 font-semibold">✓ {tieredDiscountPct}% desbloqueado</span>
                </motion.div>
              )}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                animate={{ width: progressPct + '%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            {nextTier ? (
              <p className="text-[10px] text-muted-foreground">
                Agrega <span className="text-foreground font-semibold">{formatMXN(nextTier.remaining)}</span> MXN más para desbloquear {nextTier.pct}%
              </p>
            ) : (
              <p className="text-[10px] text-emerald-500 font-semibold">🎉 ¡Máximo descuento por volumen desbloqueado!</p>
            )}
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          <AnimatePresence initial={false}>
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <ShoppingBag className="h-14 w-14 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">Tu carrito está vacío</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Agrega productos para comenzar</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setCartOpen(false)}
                >
                  Explorar productos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ) : (
              items.map((item) => {
                const itemKey = `${item.id}::${item.selectedVariant ?? ''}`;
                return (
                  <motion.div
                    key={itemKey}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 py-2.5 border-b border-border/40 last:border-0"
                  >
                    {/* Thumbnail */}
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2 leading-snug text-foreground">{item.title}</p>
                      {item.selectedVariant && item.selectedVariant !== "default" && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.selectedVariant}</p>
                      )}
                      <p className="text-xs text-primary font-bold mt-1">{formatMXN(item.price)}</p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-md border-border/60"
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs w-5 text-center font-medium tabular-nums">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-md border-border/60"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums font-medium">
                          {formatMXN(item.price * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Extras / Upselling */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-t border-border/30 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold text-foreground">Agrega a tu pedido</p>
            {/* Gift wrap */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setExtras({ giftWrap: !extras.giftWrap })}
            >
              <Checkbox
                id="gift-wrap"
                checked={extras.giftWrap}
                onCheckedChange={(v) => setExtras({ giftWrap: !!v })}
                onClick={(e) => e.stopPropagation()}
              />
              <Gift className="h-4 w-4 text-pink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Envoltura de regalo</p>
                <p className="text-[10px] text-muted-foreground">Empaque especial con tarjeta</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground tabular-nums">+$50</span>
                <AnimatePresence>
                  {extras.giftWrap && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <Badge className="text-[9px] px-1.5 py-0 bg-pink-500 text-white">✓</Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Priority shipping */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setExtras({ priorityShipping: !extras.priorityShipping })}
            >
              <Checkbox
                id="priority-shipping"
                checked={extras.priorityShipping}
                onCheckedChange={(v) => setExtras({ priorityShipping: !!v })}
                onClick={(e) => e.stopPropagation()}
              />
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Envío prioritario</p>
                <p className="text-[10px] text-muted-foreground">Entrega en 24–48 horas</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground tabular-nums">+$100</span>
                <AnimatePresence>
                  {extras.priorityShipping && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white">✓</Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 pt-3 pb-5 space-y-3 border-t border-border/50 bg-card">
            {/* Cupón */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" /> Código de descuento
              </p>
              {discountCode ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-primary font-semibold flex-1">{discountCode}</span>
                  <span className="text-xs text-primary font-bold">−{formatMXN(discountAmount)}</span>
                  <button onClick={clearDiscount} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="BIENVENIDA15"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    className="h-8 text-xs bg-muted border-border font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={discountLoading || !couponInput.trim()}
                    className="h-8 text-xs shrink-0 border-border"
                  >
                    {discountLoading ? "..." : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>

            {/* WAX Points */}
            {userPoints !== null && userPoints > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  WAX Points: <span className="text-primary ml-1">{userPoints} pts</span>
                </p>
                {loyaltyPointsApplied > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Star className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs text-primary flex-1">{loyaltyPointsApplied} pts canjeados</span>
                    <span className="text-xs text-primary font-bold">−{formatMXN(loyaltyPointsApplied)}</span>
                    <button onClick={clearLoyaltyPoints} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Hasta ${userPoints} pts`}
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      className="h-8 text-xs bg-muted border-border"
                      max={userPoints}
                      min={1}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRedeemPoints}
                      disabled={!pointsInput}
                      className="h-8 text-xs shrink-0 border-border"
                    >
                      Canjear
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-border/50" />

            {/* Totales */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'art.' : 'arts.'})</span>
                <span className="tabular-nums">{formatMXN(subtotal())}</span>
              </div>
              {tieredDiscountPct > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Descuento por volumen ({tieredDiscountPct}%)</span>
                  <span className="tabular-nums">−{formatMXN(tieredDiscount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-primary">
                  <span>Descuento ({discountCode})</span>
                  <span className="tabular-nums">−{formatMXN(discountAmount)}</span>
                </div>
              )}
              {loyaltyPointsApplied > 0 && (
                <div className="flex justify-between text-xs text-primary">
                  <span>WAX Points</span>
                  <span className="tabular-nums">−{formatMXN(loyaltyPointsApplied)}</span>
                </div>
              )}
              {extrasTotal > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Extras ({[extras.giftWrap && 'regalo', extras.priorityShipping && 'prioritario'].filter(Boolean).join(', ')})</span>
                  <span className="tabular-nums">+{formatMXN(extrasTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Envío (estimado)</span>
                <span>{shippingCost() === 0
                  ? <span className="text-primary font-semibold">Gratis</span>
                  : <span className="tabular-nums">{formatMXN(shippingCost())}</span>}
                </span>
              </div>
              <Separator className="bg-border/40 my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary tabular-nums">{formatMXN(total())}</span>
              </div>
              {waxPointsToEarn > 0 && (
                <p className="text-[10px] text-muted-foreground/70 text-right">
                  ✦ Ganarás +{waxPointsToEarn} WAX pts con esta compra
                </p>
              )}
            </div>

            <Button
              className="w-full gap-2 h-11 font-semibold"
              size="lg"
              onClick={() => { setCartOpen(false); navigate("/checkout"); }}
            >
              Ir al Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

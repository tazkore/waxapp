import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';

const STORAGE_KEY = 'wax_promo_deadline';
const DURATION_MS = 15 * 60 * 1000; // 15 min evergreen

const getDeadline = (): number => {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const v = raw ? parseInt(raw, 10) : 0;
  if (!v || v < Date.now()) {
    const next = Date.now() + DURATION_MS;
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  }
  return v;
};

const PromoCountdownBanner = () => {
  const [deadline, setDeadline] = useState<number>(() => getDeadline());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) setDeadline(getDeadline());
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const remain = Math.max(0, deadline - now);
  const mm = String(Math.floor(remain / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
  const urgent = remain < 60_000;

  return (
    <div
      role="status"
      className="w-full bg-gradient-to-r from-primary/15 via-secondary/15 to-primary/15 border-b border-border"
    >
      <div className="container mx-auto px-4 py-1.5 flex items-center justify-center gap-3 text-xs sm:text-sm">
        <Gift className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-foreground">
          15% OFF de bienvenida — Válido por:{' '}
          <span
            className={`font-mono font-bold tabular-nums text-secondary ${urgent ? 'animate-pulse' : ''}`}
            aria-live="polite"
          >
            {mm}:{ss}
          </span>
        </span>
      </div>
    </div>
  );
};

export default PromoCountdownBanner;

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const INITIAL_SECONDS = 15 * 60; // 15 minutos

export function FomoTimer() {
  const [seconds, setSeconds] = useState(() => {
    const stored = sessionStorage.getItem("fomo-timer");
    return stored ? parseInt(stored, 10) : INITIAL_SECONDS;
  });

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        const next = s - 1;
        sessionStorage.setItem("fomo-timer", String(next));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const urgent = seconds < 120;

  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide transition-colors ${
        urgent
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-primary text-primary-foreground"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>
        {seconds <= 0
          ? "¡Oferta expirada! Actualiza tu carrito"
          : `Precios especiales reservados por ${mm}:${ss} — ¡No pierdas tu carrito!`}
      </span>
    </div>
  );
}

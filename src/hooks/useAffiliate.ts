import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const AFFILIATE_KEY = "waxapp-ref";

export function useAffiliate() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(AFFILIATE_KEY, ref);
    }
  }, [location.search]);
}

export function getAffiliateRef(): string | null {
  return localStorage.getItem(AFFILIATE_KEY);
}

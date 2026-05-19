// Grupoko Auth — thin wrapper around Supabase OAuth (replaces Lovable Cloud Auth)
import { supabase } from "../supabase/client";

type Provider = "google" | "apple" | "microsoft";
type SignInOptions = { redirect_uri?: string; extraParams?: Record<string, string> };

const PROVIDER_MAP: Record<Provider, "google" | "azure"> = {
  google: "google",
  apple: "google", // fallback — Apple not configured
  microsoft: "azure",
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: PROVIDER_MAP[provider],
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error };
      return { redirected: true };
    },
  },
};

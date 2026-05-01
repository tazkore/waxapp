import { supabase } from "@/integrations/supabase/client";

export type InsertResult<T = any> = {
  data: T[] | null;
  error: any;
  attempts: number;
  retried: boolean;
};

export const isRlsError = (err: any): boolean => {
  if (!err) return false;
  if (err.code === "42501") return true;
  const msg = String(err.message || err.error_description || err.hint || "");
  return /row-level security|violates.*policy|permission denied/i.test(msg);
};

const isTransient = (err: any): boolean => {
  if (!err) return false;
  if (isRlsError(err)) return false;
  const msg = String(err.message || "").toLowerCase();
  if (/fetch failed|network|timeout|econnreset|temporarily/.test(msg)) return true;
  const code = err.code || err.status;
  return ["503", "504", "PGRST301", 503, 504].includes(code as any);
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Insert with exponential backoff; aborts immediately on RLS errors. */
export async function insertWithRetry(
  table: string,
  rows: Record<string, any>[],
  opts: { delays?: number[] } = {}
): Promise<InsertResult> {
  const delays = opts.delays ?? [400, 1200, 3000];
  let attempts = 0;
  let lastErr: any = null;
  for (let i = 0; i <= delays.length; i++) {
    attempts++;
    const { data, error } = await supabase.from(table as any).insert(rows as any).select();
    if (!error) return { data: data as any[], error: null, attempts, retried: i > 0 };
    lastErr = error;
    if (!isTransient(error) || i === delays.length) {
      return { data: null, error, attempts, retried: i > 0 };
    }
    await wait(delays[i]);
  }
  return { data: null, error: lastErr, attempts, retried: true };
}

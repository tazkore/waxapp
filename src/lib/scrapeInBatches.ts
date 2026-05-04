import { supabase } from "@/integrations/supabase/client";

export const SCRAPE_BATCH_SIZE = 30;

export interface ScrapeBatchOptions {
  urls: string[];
  provider?: string;
  use_ai?: boolean;
  job_id?: string;
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Calls firecrawl-scrape-products in chunks (max 30 URLs per call) and
 * concatenates the resulting product arrays. Throws on the first batch error.
 */
export async function scrapeProductsInBatches({
  urls,
  provider,
  use_ai,
  job_id,
  batchSize = SCRAPE_BATCH_SIZE,
  onProgress,
}: ScrapeBatchOptions): Promise<{ products: any[]; provider_used?: string; batches: number }> {
  const all: any[] = [];
  let provider_used: string | undefined;
  const total = urls.length;
  let done = 0;
  let batches = 0;

  for (let i = 0; i < total; i += batchSize) {
    const slice = urls.slice(i, i + batchSize);
    const body: Record<string, any> = { urls: slice };
    if (provider) body.provider = provider;
    if (use_ai !== undefined) body.use_ai = use_ai;
    if (job_id) body.job_id = job_id;

    const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", { body });
    if (error) throw error;
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : data.error.message || "Scrape failed");

    if (Array.isArray(data?.products)) all.push(...data.products);
    if (data?.provider_used && !provider_used) provider_used = data.provider_used;

    done += slice.length;
    batches++;
    onProgress?.(done, total);
  }

  return { products: all, provider_used, batches };
}

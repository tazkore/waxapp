import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import 'https://deno.land/std@0.224.0/dotenv/load.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
const FN_URL = `${SUPABASE_URL}/functions/v1/test-integration-connection`;

Deno.test('rejects without auth', async () => {
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ slug: 'meta_pixel', credentials: { pixel_id: '123' } }),
  });
  await r.text();
  assertEquals(r.status, 401);
});

Deno.test('rejects malformed body without auth (still 401 first)', async () => {
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: 'not json',
  });
  await r.text();
  assertEquals(r.status, 401);
});

Deno.test('CORS preflight works', async () => {
  const r = await fetch(FN_URL, { method: 'OPTIONS', headers: { apikey: ANON_KEY } });
  await r.text();
  assertEquals(r.status, 200);
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { code, landing_path } = await req.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'code required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: aff } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .eq('status', 'approved')
      .maybeSingle();

    if (!aff) {
      return new Response(JSON.stringify({ ok: false, reason: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = req.headers.get('user-agent') ?? null;
    const referer = req.headers.get('referer') ?? null;

    await supabase.from('affiliate_clicks').insert({
      affiliate_id: aff.id,
      landing_path: landing_path ?? null,
      ip_address: ip,
      user_agent: ua,
      referer,
    });

    await supabase
      .from('affiliates')
      .update({ total_clicks: (await supabase.from('affiliates').select('total_clicks').eq('id', aff.id).single()).data?.total_clicks + 1 || 1 })
      .eq('id', aff.id);

    return new Response(JSON.stringify({ ok: true, affiliate_id: aff.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

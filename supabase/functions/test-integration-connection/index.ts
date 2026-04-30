const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  slug: string;
  credentials: Record<string, string>;
}

async function testConnection(slug: string, c: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    switch (slug) {
      case 'skydropx': {
        if (!c.api_key) return { ok: false, message: 'Falta API Key' };
        const r = await fetch('https://api.skydropx.com/v1/account', {
          headers: { Authorization: `Token token=${c.api_key}` },
        });
        return r.ok
          ? { ok: true, message: 'Skydropx conectado correctamente.' }
          : { ok: false, message: `Skydropx rechazó la API Key (HTTP ${r.status}).` };
      }
      case 'meta_pixel':
      case 'tiktok_pixel': {
        if (!/^\d{10,17}$/.test(c.pixel_id || '')) return { ok: false, message: 'Pixel ID inválido (solo números, 10-17 dígitos).' };
        return { ok: true, message: 'Pixel ID válido.' };
      }
      case 'whatsapp_api': {
        if (!c.phone_number_id || !c.access_token) return { ok: false, message: 'Faltan campos.' };
        const r = await fetch(`https://graph.facebook.com/v18.0/${c.phone_number_id}`, {
          headers: { Authorization: `Bearer ${c.access_token}` },
        });
        return r.ok ? { ok: true, message: 'WhatsApp Business API verificada.' } : { ok: false, message: `WhatsApp rechazó las credenciales (HTTP ${r.status}).` };
      }
      case 'klaviyo': {
        if (!c.api_key) return { ok: false, message: 'Falta API Key' };
        const r = await fetch('https://a.klaviyo.com/api/accounts/', {
          headers: { Authorization: `Klaviyo-API-Key ${c.api_key}`, revision: '2024-10-15' },
        });
        return r.ok ? { ok: true, message: 'Klaviyo conectado.' } : { ok: false, message: `Klaviyo HTTP ${r.status}` };
      }
      case 'crisp': {
        return /^[0-9a-f-]{20,}$/i.test(c.website_id || '')
          ? { ok: true, message: 'Website ID válido.' }
          : { ok: false, message: 'Website ID inválido.' };
      }
      default: {
        // Validación básica: todos los campos deben tener valor
        const empty = Object.entries(c).filter(([, v]) => !v || !String(v).trim());
        if (empty.length) return { ok: false, message: `Campos vacíos: ${empty.map(([k]) => k).join(', ')}` };
        return { ok: true, message: 'Credenciales guardadas (sin verificación remota disponible para esta app).' };
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Payload;
    if (!body?.slug) return new Response(JSON.stringify({ ok: false, message: 'slug requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const result = await testConnection(body.slug, body.credentials || {});
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: e instanceof Error ? e.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

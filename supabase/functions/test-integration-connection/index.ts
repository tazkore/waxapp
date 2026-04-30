import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  slug: string;
  credentials: Record<string, string>;
}

type Validation =
  | { kind: 'none' }
  | { kind: 'regex'; field: string; pattern: string; message?: string }
  | {
      kind: 'http';
      method?: 'GET' | 'POST';
      url: string; // puede contener {field_key}
      headers?: Record<string, string>;
      auth?:
        | { type: 'bearer'; field: string }
        | { type: 'basic'; user_field: string; password_field: string }
        | { type: 'token'; field: string; prefix?: string } // ej "Token token="
        | { type: 'header'; header_name: string; field: string; prefix?: string };
      ok_status?: number[];
    };

function interpolate(s: string, c: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');
}

async function runValidation(
  v: Validation,
  c: Record<string, string>,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (!v || v.kind === 'none') {
      const empty = Object.entries(c).filter(([, val]) => !val || !String(val).trim());
      if (empty.length) return { ok: false, message: `Campos vacíos: ${empty.map(([k]) => k).join(', ')}` };
      return { ok: true, message: 'Credenciales guardadas (sin verificación remota disponible).' };
    }
    if (v.kind === 'regex') {
      const val = c[v.field] || '';
      return new RegExp(v.pattern).test(val)
        ? { ok: true, message: 'Formato válido.' }
        : { ok: false, message: v.message || 'Formato inválido.' };
    }
    if (v.kind === 'http') {
      const url = interpolate(v.url, c);
      const headers: Record<string, string> = { ...(v.headers || {}) };
      if (v.auth) {
        if (v.auth.type === 'bearer') headers.Authorization = `Bearer ${c[v.auth.field] || ''}`;
        else if (v.auth.type === 'token')
          headers.Authorization = `${v.auth.prefix ?? 'Token token='}${c[v.auth.field] || ''}`;
        else if (v.auth.type === 'basic')
          headers.Authorization = `Basic ${btoa(`${c[v.auth.user_field] || ''}:${c[v.auth.password_field] || ''}`)}`;
        else if (v.auth.type === 'header')
          headers[v.auth.header_name] = `${v.auth.prefix ?? ''}${c[v.auth.field] || ''}`;
      }
      const r = await fetch(url, { method: v.method || 'GET', headers });
      const ok = (v.ok_status || [200, 201, 204]).includes(r.status);
      return ok
        ? { ok: true, message: `Conectado correctamente (HTTP ${r.status}).` }
        : { ok: false, message: `El proveedor respondió HTTP ${r.status}.` };
    }
    return { ok: false, message: 'Tipo de validación desconocido.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red.' };
  }
}

// Validaciones hardcoded para apps clásicas (compatibilidad).
async function legacyTest(slug: string, c: Record<string, string>): Promise<{ ok: boolean; message: string } | null> {
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
    case 'whatsapp_api': {
      if (!c.phone_number_id || !c.access_token) return { ok: false, message: 'Faltan campos.' };
      const r = await fetch(`https://graph.facebook.com/v18.0/${c.phone_number_id}`, {
        headers: { Authorization: `Bearer ${c.access_token}` },
      });
      return r.ok
        ? { ok: true, message: 'WhatsApp Business API verificada.' }
        : { ok: false, message: `WhatsApp rechazó las credenciales (HTTP ${r.status}).` };
    }
    case 'klaviyo': {
      if (!c.api_key) return { ok: false, message: 'Falta API Key' };
      const r = await fetch('https://a.klaviyo.com/api/accounts/', {
        headers: { Authorization: `Klaviyo-API-Key ${c.api_key}`, revision: '2024-10-15' },
      });
      return r.ok ? { ok: true, message: 'Klaviyo conectado.' } : { ok: false, message: `Klaviyo HTTP ${r.status}` };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Payload;
    if (!body?.slug) {
      return new Response(JSON.stringify({ ok: false, message: 'slug requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const c = body.credentials || {};

    // 1. Cargar la fila para leer `validation` y `credential_schema`
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: row } = await supabase
      .from('integrations')
      .select('credential_schema, validation')
      .eq('slug', body.slug)
      .maybeSingle();

    // 2. Validar campos requeridos del schema
    const schema = (row?.credential_schema as Array<{ key: string; required?: boolean; label?: string }>) || [];
    const missing = schema.filter((f) => f.required !== false && !c[f.key]?.toString().trim());
    if (missing.length) {
      return new Response(
        JSON.stringify({ ok: false, message: `Faltan campos: ${missing.map((m) => m.label || m.key).join(', ')}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Si hay validation en DB, usarla. Si no, fallback legacy. Si nada, validación genérica.
    let result: { ok: boolean; message: string };
    const v = row?.validation as Validation | undefined;
    if (v && (v.kind === 'http' || v.kind === 'regex')) {
      result = await runValidation(v, c);
    } else {
      const legacy = await legacyTest(body.slug, c);
      result = legacy ?? (await runValidation({ kind: 'none' }, c));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, message: e instanceof Error ? e.message : 'Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

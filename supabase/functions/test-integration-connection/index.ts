import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Payload {
  slug: string;
  credentials: Record<string, string>;
}

interface TestResult {
  ok: boolean;
  message: string;
  status?: number;
  latency_ms?: number;
  field_errors?: Record<string, string>;
  details?: string;
}

interface SchemaField {
  key: string;
  label?: string;
  required?: boolean;
  pattern?: string;
  pattern_message?: string;
}

type Validation =
  | { kind: 'none' }
  | { kind: 'regex'; field: string; pattern: string; message?: string }
  | {
      kind: 'http';
      method?: 'GET' | 'POST';
      url: string;
      headers?: Record<string, string>;
      auth?:
        | { type: 'bearer'; field: string }
        | { type: 'basic'; user_field: string; password_field: string }
        | { type: 'token'; field: string; prefix?: string }
        | { type: 'header'; header_name: string; field: string; prefix?: string };
      ok_status?: number[];
    };

function interpolate(s: string, c: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');
}

function trimDetails(s: string, max = 500) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + 'â€¦' : s;
}

async function runValidation(v: Validation, c: Record<string, string>): Promise<TestResult> {
  try {
    if (!v || v.kind === 'none') {
      return { ok: true, message: 'Credenciales guardadas (sin verificaciÃ³n remota disponible).' };
    }
    if (v.kind === 'regex') {
      const val = c[v.field] || '';
      if (new RegExp(v.pattern).test(val)) return { ok: true, message: 'Formato vÃ¡lido.' };
      const msg = v.message || 'Formato invÃ¡lido.';
      return { ok: false, message: msg, field_errors: { [v.field]: msg } };
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
      const t0 = Date.now();
      const r = await fetch(url, { method: v.method || 'GET', headers });
      const latency_ms = Date.now() - t0;
      const body = await r.text().catch(() => '');
      const ok = (v.ok_status || [200, 201, 204]).includes(r.status);
      // Intentar mapear field_errors desde body JSON
      let field_errors: Record<string, string> | undefined;
      if (!ok && body) {
        try {
          const j = JSON.parse(body);
          if (j && typeof j === 'object' && j.errors && typeof j.errors === 'object') {
            field_errors = {};
            for (const [k, msg] of Object.entries(j.errors)) {
              field_errors[k] = Array.isArray(msg) ? String(msg[0]) : String(msg);
            }
          }
        } catch { /* body no-JSON, ignorar */ }
      }
      return ok
        ? { ok: true, message: `Conectado correctamente (HTTP ${r.status}).`, status: r.status, latency_ms, details: trimDetails(body) }
        : { ok: false, message: `El proveedor respondiÃ³ HTTP ${r.status}.`, status: r.status, latency_ms, details: trimDetails(body), field_errors };
    }
    return { ok: false, message: 'Tipo de validaciÃ³n desconocido.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red.', details: String(e) };
  }
}

async function legacyTest(slug: string, c: Record<string, string>): Promise<TestResult | null> {
  switch (slug) {
    case 'skydropx': {
      if (!c.api_key) return { ok: false, message: 'Falta API Key', field_errors: { api_key: 'Requerido' } };
      const t0 = Date.now();
      const r = await fetch('https://api.skydropx.com/v1/account', {
        headers: { Authorization: `Token token=${c.api_key}` },
      });
      const body = await r.text().catch(() => '');
      const latency_ms = Date.now() - t0;
      return r.ok
        ? { ok: true, message: 'Skydropx conectado correctamente.', status: r.status, latency_ms }
        : { ok: false, message: `Skydropx rechazÃ³ la API Key (HTTP ${r.status}).`, status: r.status, latency_ms, details: trimDetails(body), field_errors: { api_key: 'InvÃ¡lida' } };
    }
    case 'whatsapp_api': {
      const fe: Record<string, string> = {};
      if (!c.phone_number_id) fe.phone_number_id = 'Requerido';
      if (!c.access_token) fe.access_token = 'Requerido';
      if (Object.keys(fe).length) return { ok: false, message: 'Faltan campos.', field_errors: fe };
      const t0 = Date.now();
      const r = await fetch(`https://graph.facebook.com/v18.0/${c.phone_number_id}`, {
        headers: { Authorization: `Bearer ${c.access_token}` },
      });
      const body = await r.text().catch(() => '');
      const latency_ms = Date.now() - t0;
      return r.ok
        ? { ok: true, message: 'WhatsApp Business API verificada.', status: r.status, latency_ms }
        : { ok: false, message: `WhatsApp rechazÃ³ las credenciales (HTTP ${r.status}).`, status: r.status, latency_ms, details: trimDetails(body) };
    }
    case 'klaviyo': {
      if (!c.api_key) return { ok: false, message: 'Falta API Key', field_errors: { api_key: 'Requerido' } };
      const t0 = Date.now();
      const r = await fetch('https://a.klaviyo.com/api/accounts/', {
        headers: { Authorization: `Klaviyo-API-Key ${c.api_key}`, revision: '2024-10-15' },
      });
      const body = await r.text().catch(() => '');
      const latency_ms = Date.now() - t0;
      return r.ok
        ? { ok: true, message: 'Klaviyo conectado.', status: r.status, latency_ms }
        : { ok: false, message: `Klaviyo HTTP ${r.status}`, status: r.status, latency_ms, details: trimDetails(body) };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    // 1. Auth gate: requerir JWT y rol admin/super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ ok: false, message: 'No autorizado.' }, 401);
    }
    const supaUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: cErr } = await supaUser.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ ok: false, message: 'Token invÃ¡lido.' }, 401);
    const userId = claims.claims.sub;

    // Verificar rol
    const supaService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: roles } = await supaService
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const allowed = (roles || []).some((r: { role: string }) => r.role === 'admin' || r.role === 'super_admin');
    if (!allowed) return json({ ok: false, message: 'Permisos insuficientes.' }, 403);

    // 2. Validar payload
    const body = (await req.json().catch(() => null)) as Payload | null;
    if (!body?.slug) return json({ ok: false, message: 'slug requerido' }, 400);
    const c = body.credentials || {};

    // 3. Cargar definiciÃ³n de la app
    const { data: row } = await supaService
      .from('integrations')
      .select('credential_schema, validation')
      .eq('slug', body.slug)
      .maybeSingle();

    // 4. Validar campos requeridos + patterns del schema
    const schema = (row?.credential_schema as SchemaField[]) || [];
    const field_errors: Record<string, string> = {};
    for (const f of schema) {
      const val = (c[f.key] || '').toString().trim();
      if (f.required !== false && !val) {
        field_errors[f.key] = `${f.label || f.key} es requerido`;
        continue;
      }
      if (val && f.pattern) {
        try {
          if (!new RegExp(f.pattern).test(val)) {
            field_errors[f.key] = f.pattern_message || 'Formato invÃ¡lido';
          }
        } catch {
          field_errors[f.key] = 'Pattern del schema invÃ¡lido';
        }
      }
    }
    if (Object.keys(field_errors).length) {
      return json({ ok: false, message: 'Hay errores en los campos.', field_errors }, 400);
    }

    // 5. Ejecutar validaciÃ³n
    let result: TestResult;
    const v = row?.validation as Validation | undefined;
    if (v && (v.kind === 'http' || v.kind === 'regex')) {
      result = await runValidation(v, c);
    } else {
      const legacy = await legacyTest(body.slug, c);
      result = legacy ?? (await runValidation({ kind: 'none' }, c));
    }

    return json(result);
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : 'Error', details: String(e) }, 500);
  }
});


// Export/import portable de apps custom del Hub de Integraciones.
// Nunca incluye credenciales (config.api_keys), solo definición.

export interface PortableApp {
  name: string;
  slug: string;
  description: string | null;
  category: string;
  api_docs_url: string | null;
  version: string | null;
  schema_version: number;
  credential_schema: unknown;
  validation: unknown;
}

export interface PortableAppFile {
  wax_app_version: 1;
  exported_at: string;
  app: PortableApp;
}

export function serializeApp(row: {
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  api_docs_url?: string | null;
  version?: string | null;
  schema_version?: number;
  credential_schema?: unknown;
  validation?: unknown;
}): PortableAppFile {
  return {
    wax_app_version: 1,
    exported_at: new Date().toISOString(),
    app: {
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      category: row.category,
      api_docs_url: row.api_docs_url ?? null,
      version: row.version ?? '1.0.0',
      schema_version: row.schema_version ?? 1,
      credential_schema: row.credential_schema ?? [],
      validation: row.validation ?? { kind: 'none' },
    },
  };
}

export function downloadAppJson(row: Parameters<typeof serializeApp>[0]) {
  const payload = serializeApp(row);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${row.slug}.wax-app.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAppFile(raw: string): { ok: true; data: PortableAppFile } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON inválido.' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Estructura inválida.' };
  const p = parsed as Record<string, unknown>;
  if (p.wax_app_version !== 1) return { ok: false, error: 'Versión de archivo no soportada.' };
  const app = p.app as Record<string, unknown> | undefined;
  if (!app) return { ok: false, error: 'Falta el bloque "app".' };
  if (typeof app.name !== 'string' || typeof app.slug !== 'string') return { ok: false, error: 'name/slug requeridos.' };
  if (!Array.isArray(app.credential_schema)) return { ok: false, error: 'credential_schema debe ser un array.' };
  return { ok: true, data: parsed as PortableAppFile };
}

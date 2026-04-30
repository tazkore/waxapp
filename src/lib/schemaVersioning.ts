// Versionado y migración de credential_schema.

export interface SchemaField {
  key: string;
  label: string;
  type?: 'text' | 'password';
  required?: boolean;
  placeholder?: string;
  helper?: string;
  pattern?: string;
  pattern_message?: string;
  rename_from?: string; // permite renombrar key sin perder valor
}

export interface SchemaHistoryEntry {
  version: number;
  schema: SchemaField[];
  migrated_at: string;
  note?: string;
}

export function diffSchemas(prev: SchemaField[], next: SchemaField[]) {
  const prevKeys = new Set(prev.map((f) => f.key));
  const nextKeys = new Set(next.map((f) => f.key));
  const added = next.filter((f) => !prevKeys.has(f.key));
  const removed = prev.filter((f) => !nextKeys.has(f.key));
  const changed = next.filter((f) => {
    const old = prev.find((p) => p.key === f.key);
    return old && JSON.stringify(old) !== JSON.stringify(f);
  });
  return { added, removed, changed, hasDiff: added.length + removed.length + changed.length > 0 };
}

export function migrateCredentials(
  newSchema: SchemaField[],
  oldKeys: Record<string, string>,
): { values: Record<string, string>; missing: string[] } {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const f of newSchema) {
    if (oldKeys[f.key] !== undefined) {
      out[f.key] = oldKeys[f.key];
    } else if (f.rename_from && oldKeys[f.rename_from] !== undefined) {
      out[f.key] = oldKeys[f.rename_from];
    } else {
      out[f.key] = '';
      if (f.required !== false) missing.push(f.key);
    }
  }
  return { values: out, missing };
}

export function bumpHistory(
  currentHistory: SchemaHistoryEntry[],
  prevVersion: number,
  prevSchema: SchemaField[],
  note?: string,
): SchemaHistoryEntry[] {
  return [
    ...currentHistory,
    { version: prevVersion, schema: prevSchema, migrated_at: new Date().toISOString(), note },
  ];
}

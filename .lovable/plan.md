## Objetivo

Llevar el Hub de Integraciones a nivel "producción": portabilidad de apps custom (export/import JSON), versionado del schema, pantalla de prueba previa al guardado, errores granulares por campo, endurecimiento de seguridad SQL/Storage y QA end-to-end.

---

### 1. Export / Import de apps custom como JSON

**Formato del archivo (`.wax-app.json`)**
```json
{
  "wax_app_version": 1,
  "exported_at": "2026-04-30T...",
  "app": {
    "name": "Mailchimp",
    "slug": "mailchimp",
    "description": "...",
    "category": "marketing",
    "api_docs_url": "https://...",
    "version": "1.0.0",
    "schema_version": 1,
    "credential_schema": [ { "key": "api_key", "label": "API Key", "type": "password", "required": true } ],
    "validation": { "kind": "http", "method": "GET", "url": "...", "auth": {...} }
  }
}
```
- **Nunca** se exportan credenciales (`config.api_keys`), solo definición.

**UI** (en `IntegrationsSection.tsx` toolbar y en cada `AppStoreCard` con menú `⋯` para apps `is_custom`):
- Botón **Importar JSON** (input file oculto) → parsea, muestra preview en `ImportAppDialog.tsx`, valida formato, permite editar slug si choca, e inserta en `integrations`.
- Botón **Exportar** por app custom → genera blob y descarga.

**Archivos**
- nuevo `src/components/admin/integrations/ImportAppDialog.tsx`
- nuevo `src/lib/appPortability.ts` — `serializeApp(row)`, `parseAppFile(json)`, `validateAppPayload()`
- editado `IntegrationsSection.tsx` — botones Importar/Exportar
- editado `AppStoreCard.tsx` — menú ⋯ con "Exportar JSON" cuando `is_custom`

---

### 2. Versionado de `credential_schema`

**Modelo** (migration):
- Añadir a `integrations`:
  - `schema_version int not null default 1`
  - `schema_history jsonb not null default '[]'` — array `[{version, schema, migrated_at, note}]`

**Migración de credenciales al cargar config**
- Helper `migrateCredentials(currentSchema, oldKeys)`:
  - Para cada field nuevo: si no existe en `oldKeys`, queda vacío (requiere reconfirmación).
  - Para fields removidos: se descartan (no se borran del DB hasta que el usuario guarde).
  - Para renombrados (vía mapping opcional `rename_from` en el field): copiar valor.
- Al editar el schema desde `AddCustomAppDialog`/edición:
  - Comparar contra `credential_schema` actual; si hay diff → incrementar `schema_version`, push al `schema_history`, persistir.
- Al abrir `ConnectAppDialog` o el panel de configuración:
  - Si `app.config.schema_version_used != app.schema_version` → mostrar banner ámbar **"Esta app fue actualizada (v{old}→v{new}). Revisa los campos."** y forzar re-test.

**Archivos**
- migration: `ALTER TABLE integrations ADD schema_version, schema_history`
- nuevo `src/lib/schemaVersioning.ts` — `diffSchemas`, `migrateCredentials`, `bumpSchema`
- editado `ConnectAppDialog.tsx` — banner de migración

---

### 3. Pantalla "Probar conexión" antes de guardar

Refactor de `ConnectAppDialog.tsx` a flujo de 2 pasos visibles (sin wizard pesado):

```
[ Form de credenciales ]
        ↓ click "Probar conexión"
[ Estado en vivo: pendiente → ok / error ]
   ├── pendiente: spinner + "Validando con {provider}…"
   ├── ok: ✓ verde + detalles HTTP (status, latencia ms, mensaje) + botón "Guardar"
   └── error: ✗ rojo + mensaje + (si validation http) status code, body recortado, campo culpable
        ↓
[ Guardar credenciales ]  (deshabilitado hasta tener un OK reciente, o bypass con confirmación)
```

- Estado: `'idle' | 'testing' | 'ok' | 'error'`.
- Mantener resultado visible aunque el usuario edite (se invalida al cambiar cualquier credencial → vuelve a `idle`).
- Botón **Guardar** separado de **Probar**; en modo "validación none" se permite guardar directo.

**Edge function** retorna ahora payload extendido:
```ts
{
  ok: boolean,
  message: string,
  status?: number,        // HTTP status del proveedor
  latency_ms?: number,
  field_errors?: Record<string,string>,  // por campo
  details?: string        // body recortado a 500 chars
}
```

---

### 4. Errores detallados y validación por campo

**Edge function `test-integration-connection`**
- Antes de ejecutar `validation`, validar schema:
  - Cada `field.required` faltante → push a `field_errors[key] = "Campo requerido"`.
  - Si `field.pattern` (nuevo opcional en el schema) no matchea → `field_errors[key] = field.pattern_message || 'Formato inválido'`.
- `validation.kind = 'regex'`:
  - Devolver `field_errors[v.field]` con el mensaje configurado.
- `validation.kind = 'http'`:
  - Capturar `status`, `latency_ms` (Date.now diff), y `details` (primeros 500 chars del body).
  - Si `4xx` con body JSON, intentar mapear `error.field` → `field_errors`.
- Try/catch global → `{ ok:false, message: 'Error de red', details: e.message }`.

**UI**
- `ConnectAppDialog`: cada `<Input>` muestra mensaje rojo debajo si `field_errors[field.key]` existe; el campo se marca con `border-destructive`.
- Banner agregado con `status`, `latency_ms` y `details` colapsable (`<details><summary>Ver respuesta del proveedor</summary><pre>{details}</pre></details>`).

**Archivos**
- editado `supabase/functions/test-integration-connection/index.ts`
- editado `src/components/admin/integrations/ConnectAppDialog.tsx`
- nuevo `src/components/admin/integrations/TestConnectionPanel.tsx` — extraído del dialog para reuso

---

### 5. Endurecimiento de seguridad

**Linter actual**: 18 warnings — 14 son `Public/Signed-In Users Can Execute SECURITY DEFINER Function`, 1 `Public Bucket Allows Listing` (bucket `media`), 1 `Extension in Public`, otros menores.

**Acciones (migration única)**:

a. **SECURITY DEFINER functions — restringir EXECUTE**
```sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_substore_access(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_welcome_coupon() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_confirmed() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_seo_redirect() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_payment_transaction_changes() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_published_version_to_sub_store() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_substore_access(uuid, uuid) TO authenticated;
-- Triggers: nadie debe llamarlas directo, las dispara el trigger interno.
```

b. **Bucket `media`** — quitar listado público:
```sql
-- Mantener bucket public (URLs directas funcionan), pero remover policy de SELECT amplia
DROP POLICY IF EXISTS "Public read media" ON storage.objects;
CREATE POLICY "Public read media by path" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');
-- Si existe policy específica de listado, dropearla. (Inspeccionar antes con read_query.)
```
> Nota: si el bucket sirve assets públicos vía URL, los `getPublicUrl` siguen funcionando; lo que se cierra es `list()` desde el cliente anon.

c. **Extension in public** — informativo. Documentar como aceptado; mover a `extensions` schema solo si no rompe (probable que sí rompa pgcrypto/uuid). Marcar como ignored con justificación si afecta `gen_random_uuid`.

d. **Edge function `test-integration-connection`** — agregar verificación JWT explícita y rol admin (lectura de `user_roles`) antes de leer/usar credenciales del request, y rate-limit suave por user (in-memory map o vía `admin_notifications`).

**Archivos**
- migration: `revoke_execute_security_definer_and_storage`
- editado `supabase/functions/test-integration-connection/index.ts` — auth gate
- ignorar (con `manage_security_finding`) findings que sean falsos positivos justificados (ext in public).

---

### 6. QA end-to-end

Una vez aplicado todo lo anterior, ejecutar verificación manual + scripted:

**Pruebas funcionales**:
1. Login como super_admin → `/admin/integrations`.
2. Crear app custom "Demo Echo" con validación HTTP a `https://httpbin.org/get`, schema con `api_key` requerido.
3. Exportar JSON → borrar app → Importar JSON → verificar slug, schema, validation iguales.
4. Conectar app: dejar campo vacío → ver error por campo. Llenar mal → ver error con status. Llenar bien → ver OK con latencia. Guardar.
5. Editar schema (añadir campo `secret_key`) → verificar `schema_version=2`, banner de migración al reabrir, re-test forzado.
6. En `OrdersSection`: verificar gating de "Generar Guía" sigue funcionando con `useIntegrationActive('skydropx')`.
7. Logout → verificar que `test-integration-connection` rechaza con 401.
8. Re-correr `supabase--linter` → confirmar reducción de warnings.

**Tests automatizados (Deno)**
- `supabase/functions/test-integration-connection/index_test.ts`:
  - Test: rechaza sin auth.
  - Test: 400 con `field_errors` cuando faltan requeridos.
  - Test: 200 OK con validación regex válida.
  - Test: payload incluye `status` y `latency_ms` para HTTP.

---

### Resumen de archivos

**Nuevos**
- `src/lib/appPortability.ts`
- `src/lib/schemaVersioning.ts`
- `src/components/admin/integrations/ImportAppDialog.tsx`
- `src/components/admin/integrations/TestConnectionPanel.tsx`
- `supabase/functions/test-integration-connection/index_test.ts`
- 2 migrations: schema_version + revoke_execute/storage

**Editados**
- `src/components/admin/IntegrationsSection.tsx` (botón importar, exportar)
- `src/components/admin/integrations/AppStoreCard.tsx` (menú ⋯)
- `src/components/admin/integrations/ConnectAppDialog.tsx` (test panel + field errors + banner versión)
- `src/components/admin/integrations/AddCustomAppDialog.tsx` (bump schema_version on edit)
- `supabase/functions/test-integration-connection/index.ts` (auth, field_errors, latency, details)

Sin cambios en `src/integrations/supabase/types.ts` (auto-generado).

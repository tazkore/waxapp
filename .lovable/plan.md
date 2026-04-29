## Objetivo

Convertir el flujo "Importar Sitio" en un creador de **sub-tiendas completas por marca**, con:
1. Asignación de productos/páginas/branding a una sub-tienda al final del importer.
2. Nueva sección lateral **Tiendas** con submenú por sub-tienda y mini-panel admin acotado a esa marca.
3. Dominios temporales automáticos (`/s/{slug}` + subdominio `{slug}.waxapp.mx`) cuando el dominio externo no está verificado.
4. Asignación de **staff por tienda** desde Staff & Permisos.
5. Copyright `© WAXAPP.MX` global en todas las tiendas/sub-tiendas.

Solo el **super_admin** ve y administra todas las tiendas. Los admins/moderadores asignados solo ven la(s) suya(s).

---

## 1. Importer → Crear sub-tienda al finalizar

En `SiteImporterSection.tsx`, tras el paso 3 (productos importados) añadir paso 4 "Crear tienda":
- Input: nombre tienda, slug (auto), marca asociada (select de `brands` o "crear nueva").
- Botón **"Crear sub-tienda con todo lo importado"** que:
  - Crea/usa `brands` row.
  - Crea `sub_stores` row aplicando el `branding` extraído (colores, fuentes, logo, hero).
  - Hace `UPDATE products SET sub_store_id = X, brand_id = Y WHERE id IN (importados)` usando ids retornados por `import-products`.
  - Inserta filas en `domains` (estado `pending` para el dominio externo + `active` para el slug temporal).
  - Redirige a la nueva sección `Tiendas → {slug}`.

Modificar edge function `import-products` para devolver los IDs creados (ya devuelve `imported`, sumar `product_ids: []`).

---

## 2. Sección lateral "Tiendas" con submenú

`AdminSidebar.tsx`: añadir item **Tiendas** (ícono `Store`) con submenú colapsable que lista todas las `sub_stores` accesibles al usuario actual.

- Super admin → ve todas.
- Admin/moderador → solo las que tiene asignadas en la nueva tabla `sub_store_staff`.

Cada item del submenú navega a `Admin?store={subStoreId}` que renderiza un nuevo componente **`SubStoreAdminPanel`** que reusa los componentes existentes (`InventorySection`, `OrdersSection`, `BlogSection`, `ThemeSection`, `BrandsSection`, `BannersSection`, `MediaSection`, `MarketingSection`) pero con un contexto `SubStoreContext` que filtra todas las queries por `sub_store_id`.

Mini-sidebar interna del panel de tienda con tabs:
```
Vista general · Inventario · Pedidos · Marketing · Blog · Tema · Multimedia · Banners · Dominios
```

Las secciones reciben prop opcional `subStoreId` y al estar presente:
- Filtran `*.eq('sub_store_id', subStoreId)`.
- Las inserciones añaden ese campo automáticamente.
- Ocultan controles globales (Setup, Integraciones, API Keys, Staff global).

---

## 3. Tabla nueva: `sub_store_staff`

Migración:
```sql
CREATE TABLE public.sub_store_staff (
  id uuid PK default gen_random_uuid(),
  sub_store_id uuid REFERENCES sub_stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin', -- 'admin' | 'moderator'
  created_at timestamptz default now(),
  UNIQUE(sub_store_id, user_id)
);
-- RLS: super_admin manage all; users see own rows
```

Función helper:
```sql
CREATE FUNCTION public.has_substore_access(_uid uuid, _store uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT has_role(_uid,'super_admin')
    OR EXISTS(SELECT 1 FROM sub_store_staff WHERE user_id=_uid AND sub_store_id=_store);
$$;
```

Hook nuevo `useSubStoreAccess(subStoreId)` que la consulta vía RPC.

---

## 4. Dominios temporales automáticos

En `DomainsSection.tsx` y al crear sub-tienda:
- Siempre se crea un registro `domains` con `hostname = '{slug}.preview.waxapp.mx'`, `status='active'`, `is_primary=false`.
- Si el usuario añade un hostname externo y SSL no se ha verificado tras X minutos, mostrar banner "Usando dirección temporal: `{slug}.preview.waxapp.mx`" con botón copiar.
- La función `check-connectors` se extiende con un check `verifyDomain(hostname)` que hace HEAD y compara con DNS esperado; el resultado se guarda en `domains.status`.

Nota: para que el subdominio funcione realmente requiere wildcard DNS en Lovable. Mientras tanto se usa la ruta `/s/{slug}` ya existente como fallback temporal. Mostrar en UI ambas opciones.

---

## 5. Staff & Permisos: asignación por tienda

`StaffSection.tsx`:
- En el diálogo "Permisos" añadir tab **"Tiendas"** con lista de sub-tiendas y checkbox + selector de rol (admin/moderator) por cada una.
- Guardar vía edge function `manage-users` action `set_substore_access` que upsertea/elimina filas en `sub_store_staff`.
- En tabla principal añadir columna **"Tiendas"** mostrando badges con los slugs asignados (o "Todas" si super_admin).
- Botón "Crear Staff" añade selector "Tienda asignada (opcional)" para creación rápida.

Editar `supabase/functions/manage-users/index.ts` para soportar:
- `action: 'list_substore_access', user_id`
- `action: 'set_substore_access', user_id, assignments: [{sub_store_id, role}]`

---

## 6. Copyright global

Crear componente `<Copyright />` que renderiza:
```
© WAXAPP.MX 2026 · Hecho con ciencia.
```

Insertarlo en:
- `Footer.tsx` (ya existe año, normalizar texto).
- `SubStorePage.tsx` (reemplaza el footer actual "Sub-tienda remixada").
- `Admin.tsx` (línea pequeña en el bottom del main).
- `ClientDashboard.tsx`, `Checkout.tsx`, etc. (si tienen footer propio).

---

## Detalles técnicos

### Archivos a crear
- `src/contexts/SubStoreContext.tsx` — provee `subStoreId` actual y filtros.
- `src/components/admin/SubStoreAdminPanel.tsx` — wrapper con sub-sidebar interno.
- `src/components/admin/StoresMenuGroup.tsx` — submenú colapsable en sidebar.
- `src/components/Copyright.tsx`.
- `src/hooks/useAccessibleSubStores.ts` — devuelve sub-tiendas a las que el user accede.
- Migración: `sub_store_staff` + función `has_substore_access` + RLS update en sub_stores.

### Archivos a editar
- `src/components/admin/AdminSidebar.tsx` — añadir grupo "Tiendas".
- `src/components/admin/SiteImporterSection.tsx` — paso 4 "Crear sub-tienda".
- `src/components/admin/StaffSection.tsx` — tab "Tiendas" en permisos.
- `src/components/admin/DomainsSection.tsx` — banner dirección temporal + auto-creación.
- `src/components/Footer.tsx`, `src/pages/SubStorePage.tsx` — copyright unificado.
- `src/pages/Admin.tsx` — manejo de `?store=` y render de `SubStoreAdminPanel`.
- `supabase/functions/manage-users/index.ts` — acciones substore.
- `supabase/functions/import-products/index.ts` — devolver `product_ids`.

### RLS y seguridad
- `sub_store_staff`: solo super_admin INSERT/UPDATE/DELETE. SELECT por super_admin o `user_id = auth.uid()`.
- `sub_stores` UPDATE: añadir condición OR `has_substore_access(auth.uid(), id)` para que admins de tienda editen su tema/branding.
- `products` UPDATE/INSERT: dejar como está (admin global). Para edits dentro de una sub-tienda, se valida server-side filtrando por `sub_store_id`.

### Notas
- No se requieren nuevos secrets.
- El subdominio real `{slug}.waxapp.mx` necesita wildcard DNS configurado por el owner del dominio; mientras, `/s/{slug}` es la ruta funcional y se muestra como dirección temporal canónica.
- Sin Realtime en estas tablas (regla del proyecto).

---

## Resultado esperado

- Super admin termina de importar un sitio → un click crea sub-tienda con productos, branding, dominio temporal y entrada en sidebar.
- Asigna un admin a esa tienda desde Staff → ese admin solo ve "Tiendas → {esa}" con panel restringido.
- Cada vista pública/admin muestra `© WAXAPP.MX`.

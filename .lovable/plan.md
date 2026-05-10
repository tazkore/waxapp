## Objetivo

Mejorar el flujo de importación de productos con un reporte descargable, vista previa "dry run", manejo granular de duplicados con diálogo Dark Mode Tech, y reemplazar el badge "Facturación CFDI" por "Producto 100%" con modales informativos en `TrustSignals`.

---

## 1. Modo Dry Run (vista previa antes de importar)

**Edge Function `import-products`:**
- Aceptar nuevo campo `dry_run: boolean` en el body.
- Cuando `dry_run = true`: ejecutar solo la detección por SKU/nombre, **no insertar/actualizar nada**, **no descargar imágenes**, **no tocar `import_jobs`**.
- Devolver: `{ would_create, would_update, would_skip, duplicates: [{ index, name, sku, existing_id, existing_name, reason }] }` con detalles para cada producto.

**UI `SiteImporterSection`:**
- Antes del botón "Importar X productos" añadir un nuevo paso: botón **"Analizar duplicados"** que invoca `dry_run`.
- Mostrar un panel resumen con 3 chips Dark Mode Tech:
  - Verde neón: `X se crearán`
  - Ámbar: `Y duplicados`
  - Gris: `Z se actualizarán` (si el usuario decide sobrescribir)
- Si hay duplicados → desbloquear el botón "Revisar duplicados".

---

## 2. Diálogo de duplicados con selección granular

**Nuevo componente `DuplicatesReviewDialog.tsx`** (en `src/components/admin/`):
- `Dialog` de shadcn con `bg-background border-primary/30`, header con ícono `AlertTriangle` ámbar.
- Tabla scrollable con columnas: `Checkbox | Producto importado | Coincidencia existente | Razón (SKU/nombre) | Acción`.
- Cada fila representa un duplicado; checkbox marca si se debe sobrescribir.
- Acciones globales arriba: "Sobrescribir todos", "Omitir todos", "Invertir selección".
- Footer: dos botones — `Cancelar` (ghost) y `Aplicar (N sobrescribir, M omitir)` (primario neón).
- Estilos: usar tokens semánticos (`text-primary`, `bg-card`, `border-border`, `ring-primary/40`); nada de colores hardcoded.

**Edge Function ajuste:**
- Aceptar `overwrite_ids: string[]` (índices o SKUs de los productos a sobrescribir). Los duplicados que NO estén en la lista se omiten; los nuevos siempre se insertan.

**UI flujo:**
1. Usuario selecciona productos → click "Analizar duplicados" (dry-run).
2. Si hay duplicados → abre `DuplicatesReviewDialog` con la lista.
3. Usuario marca cuáles sobrescribir → click "Aplicar".
4. Se invoca `import-products` real con `overwrite_ids`.
5. Eliminar el `window.confirm` actual.

---

## 3. Reporte descargable (CSV + PDF)

**Nuevo helper `src/lib/exportImportReport.ts`:**
- `downloadImportReportCSV(result)` — genera CSV con secciones:
  - Resumen (creados, actualizados, omitidos, errores, fecha, dominio origen).
  - Detalle por producto (nombre, SKU, acción, ID resultante, mensaje).
- `downloadImportReportPDF(result)` — usa `jsPDF` (ya disponible si no, agregar) con header marca WAX, tabla simple, paleta dark.

**UI:**
- Tras finalizar la importación (estado `done`), añadir card "Reporte de importación" con dos botones: `Descargar CSV` y `Descargar PDF`.
- El edge function ya devuelve `imported`, `updated`, `errors`, `duplicates`, `product_ids`. Mantener estos datos en estado (`lastImportResult`) para el reporte.

---

## 4. TrustSignals: "Producto 100%" + modales informativos

**`src/components/TrustSignals.tsx`:**
- Reemplazar el item `{ icon: FileText, text: 'Facturación CFDI' }` por:
  ```
  { icon: BadgeCheck, text: 'Producto 100% Original',
    info: { title, description, points[] } }
  ```
- Añadir el campo `info` a los **4 signals** con contenido relevante (no solo al nuevo).
- Hacer cada `motion.div` clickeable (`button`, `cursor-pointer`, `hover:scale-105`, `focus-visible:ring-primary`).
- Al click → abre un `Dialog` de shadcn con:
  - Ícono grande del signal en neón verde.
  - Título y descripción.
  - Lista con bullets.
  - Botón "Entendido" primario.
- Estilos Dark Mode Tech: `bg-card`, borde `border-primary/20`, glow sutil.

**Contenido propuesto (editable):**
- Efecto en < 5 Minutos → "Absorción nano-emulsión rápida..."
- Legal y Certificado → "Cumplimos con regulación COFEPRIS..."
- **Producto 100% Original** → "Garantía de autenticidad. Trazabilidad por lote, sellos de seguridad..."
- Envíos Asegurados → "Cobertura total contra pérdida o daño..."

---

## Archivos a crear/modificar

**Crear:**
- `src/components/admin/DuplicatesReviewDialog.tsx`
- `src/components/TrustSignalInfoDialog.tsx` (o inline en TrustSignals)
- `src/lib/exportImportReport.ts`

**Modificar:**
- `supabase/functions/import-products/index.ts` — añadir `dry_run` y `overwrite_ids`.
- `src/components/admin/SiteImporterSection.tsx` — flujo dry-run, integración del diálogo, eliminar `window.confirm`, panel de reporte.
- `src/components/TrustSignals.tsx` — nuevo signal y handler de modal.

**Sin cambios de DB ni nuevos secrets.**

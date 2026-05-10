// Helpers to download import-result reports as CSV or PDF.
// Result shape matches what the `import-products` edge function returns.

export interface ImportProductInput {
  name: string;
  sku?: string | null;
  price?: number;
  category?: string | null;
  source_url?: string;
}

export interface ImportDuplicate {
  index: number;
  name: string;
  sku: string | null;
  existing_id: string;
  existing_name?: string;
  reason: string;
}

export interface ImportReportData {
  imported: number;
  updated: number;
  errors: string[];
  duplicates: ImportDuplicate[];
  product_ids: string[];
  source_url?: string;
  origin_domain?: string;
  // Original list submitted to the importer, in the same order as `index` in duplicates
  products?: ImportProductInput[];
}

const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export function downloadImportReportCSV(data: ImportReportData, basename = "wax-import-report") {
  const rows: string[] = [];
  // Section: Resumen
  rows.push("Resumen");
  rows.push(["Fecha", csvCell(new Date().toLocaleString("es-MX"))].join(","));
  if (data.source_url) rows.push(["Origen URL", csvCell(data.source_url)].join(","));
  if (data.origin_domain) rows.push(["Dominio destino", csvCell(data.origin_domain)].join(","));
  rows.push(["Creados", data.imported].join(","));
  rows.push(["Actualizados", data.updated].join(","));
  rows.push(["Duplicados omitidos", data.duplicates.length].join(","));
  rows.push(["Errores", data.errors.length].join(","));
  rows.push("");

  // Section: Detalle creados/actualizados
  rows.push("Productos importados");
  rows.push(["#", "ID Producto"].map(csvCell).join(","));
  data.product_ids.forEach((id, i) => rows.push([i + 1, csvCell(id)].join(",")));
  rows.push("");

  // Section: Duplicados
  rows.push("Duplicados");
  rows.push(["#", "Nombre importado", "SKU", "Coincidencia existente", "Razón"].map(csvCell).join(","));
  data.duplicates.forEach((d, i) =>
    rows.push(
      [i + 1, csvCell(d.name), csvCell(d.sku ?? ""), csvCell(d.existing_name ?? d.existing_id), csvCell(d.reason)].join(","),
    ),
  );
  rows.push("");

  // Section: Errores
  rows.push("Errores");
  rows.push(["#", "Mensaje"].map(csvCell).join(","));
  data.errors.forEach((e, i) => rows.push([i + 1, csvCell(e)].join(",")));

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${basename}-${stamp()}.csv`);
}

/**
 * Lightweight PDF export: builds a printable HTML document and triggers
 * `window.print()` which lets the user "Save as PDF" from the browser dialog.
 * Avoids adding a heavy PDF dependency just for this report.
 */
export function downloadImportReportPDF(data: ImportReportData, basename = "wax-import-report") {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    // Fallback to CSV if popup blocked
    downloadImportReportCSV(data, basename);
    return;
  }
  const escapeHtml = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const dupRows =
    data.duplicates
      .map(
        (d, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.sku ?? "—")}</td>
        <td>${escapeHtml(d.existing_name ?? d.existing_id)}</td>
        <td>${escapeHtml(d.reason)}</td>
      </tr>`,
      )
      .join("") || `<tr><td colspan="5" style="text-align:center;color:#888">— Ninguno —</td></tr>`;

  const errRows =
    data.errors.map((e, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(e)}</td></tr>`).join("") ||
    `<tr><td colspan="2" style="text-align:center;color:#888">— Ninguno —</td></tr>`;

  const idRows =
    data.product_ids.map((id, i) => `<tr><td>${i + 1}</td><td><code>${escapeHtml(id)}</code></td></tr>`).join("") ||
    `<tr><td colspan="2" style="text-align:center;color:#888">— Ninguno —</td></tr>`;

  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
<title>Reporte de importación · WAX</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #0A0A0A; margin: 32px; }
  header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #00C853; padding-bottom:12px; margin-bottom:24px; }
  h1 { font-family:'Space Grotesk', sans-serif; font-size: 20px; margin: 0; }
  h2 { font-family:'Space Grotesk', sans-serif; font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: .04em; color:#444; }
  .summary { display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 24px; }
  .stat { border:1px solid #eee; border-radius:8px; padding:12px; }
  .stat .lbl { font-size:11px; text-transform:uppercase; color:#666; letter-spacing:.05em; }
  .stat .val { font-size:24px; font-weight:700; margin-top:4px; }
  .stat.green .val { color:#00C853; }
  .stat.amber .val { color:#FFB300; }
  .stat.red .val { color:#D32F2F; }
  table { width:100%; border-collapse: collapse; font-size:12px; }
  th, td { padding:8px; text-align:left; border-bottom:1px solid #eee; vertical-align: top; }
  th { background:#fafafa; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:.05em; color:#555; }
  code { font-family: ui-monospace, monospace; font-size: 11px; }
  footer { margin-top: 32px; padding-top:12px; border-top:1px solid #eee; font-size:11px; color:#888; text-align:center; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<header>
  <div>
    <h1>Reporte de importación de productos</h1>
    <div style="font-size:12px;color:#666">${escapeHtml(new Date().toLocaleString("es-MX"))}</div>
  </div>
  <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:#00C853">WAX</div>
</header>

${data.source_url ? `<div style="font-size:12px;margin-bottom:8px"><strong>Origen:</strong> ${escapeHtml(data.source_url)}</div>` : ""}
${data.origin_domain ? `<div style="font-size:12px;margin-bottom:8px"><strong>Dominio:</strong> ${escapeHtml(data.origin_domain)}</div>` : ""}

<div class="summary">
  <div class="stat green"><div class="lbl">Creados</div><div class="val">${data.imported}</div></div>
  <div class="stat green"><div class="lbl">Actualizados</div><div class="val">${data.updated}</div></div>
  <div class="stat amber"><div class="lbl">Duplicados</div><div class="val">${data.duplicates.length}</div></div>
  <div class="stat red"><div class="lbl">Errores</div><div class="val">${data.errors.length}</div></div>
</div>

<h2>Productos importados (${data.product_ids.length})</h2>
<table><thead><tr><th>#</th><th>ID</th></tr></thead><tbody>${idRows}</tbody></table>

<h2>Duplicados (${data.duplicates.length})</h2>
<table><thead><tr><th>#</th><th>Nombre</th><th>SKU</th><th>Coincidencia</th><th>Razón</th></tr></thead><tbody>${dupRows}</tbody></table>

<h2>Errores (${data.errors.length})</h2>
<table><thead><tr><th>#</th><th>Mensaje</th></tr></thead><tbody>${errRows}</tbody></table>

<footer>Generado por WAX · ${escapeHtml(basename)}-${escapeHtml(stamp())}</footer>

<script>setTimeout(()=>window.print(),300);</script>
</body></html>`);
  w.document.close();
}

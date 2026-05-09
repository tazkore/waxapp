import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AffiliateRow {
  rank: number;
  vendor: string;
  email: string;
  code: string;
  clicks: number;
  sales: number;
  commission: number;
  status?: string;
}

export interface AffiliateKpis {
  totalClicks: number;
  totalSales: number;
  conv: number;
  commissions: number;
  rangeLabel: string;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAffiliatesCSV = (rows: AffiliateRow[]) => {
  const csv = Papa.unparse(rows);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `afiliados-${Date.now()}.csv`);
};

export const exportAffiliatesPDF = (rows: AffiliateRow[], kpis: AffiliateKpis) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Reporte de Afiliados — WAXAPP', 14, 16);
  doc.setFontSize(10);
  doc.text(`Rango: ${kpis.rangeLabel}`, 14, 23);
  doc.text(
    `Clics: ${kpis.totalClicks}   Ventas: ${kpis.totalSales}   Conv: ${kpis.conv.toFixed(1)}%   Comisiones: $${kpis.commissions.toLocaleString()}`,
    14,
    29
  );
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Vendedor', 'Email', 'Código', 'Clics', 'Ventas', 'Comisión $', 'Estado']],
    body: rows.map((r) => [
      r.rank,
      r.vendor,
      r.email,
      r.code,
      r.clicks,
      r.sales,
      `$${r.commission.toLocaleString()}`,
      r.status || '-',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 230, 118] },
  });
  doc.save(`afiliados-${Date.now()}.pdf`);
};

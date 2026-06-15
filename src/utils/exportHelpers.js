import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './formatters';

/**
 * exportToExcel — two call signatures:
 *   exportToExcel(data, columns, fileName)  — columns: [{ header, key, accessor }]
 *   exportToExcel(data, fileName)           — auto-derives columns from data keys
 */
export const exportToExcel = (data, columnsOrName = 'export', fileNameArg = 'export') => {
  if (!Array.isArray(data) || data.length === 0) return;

  let worksheet;
  let fileName;

  if (typeof columnsOrName === 'string') {
    // Simple form: just dump the raw objects
    fileName = columnsOrName;
    worksheet = XLSX.utils.json_to_sheet(data);
  } else {
    // Column-mapped form
    fileName = fileNameArg;
    const columns = columnsOrName;
    worksheet = XLSX.utils.json_to_sheet(
      data.map(row => {
        const obj = {};
        columns.forEach(col => {
          obj[col.header] = col.accessor ? col.accessor(row) : (row[col.key] ?? '');
        });
        return obj;
      })
    );
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, `${fileName}-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = (data, columns, title, fileName = 'export', firmName = 'CA Firm') => {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setTextColor(91, 107, 122);
  doc.text(firmName, 14, 15);

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(title, 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${formatDate(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 32);

  autoTable(doc, {
    startY: 38,
    head: [columns.map(c => c.header)],
    body: data.map(row =>
      columns.map(col => col.accessor ? col.accessor(row) : (row[col.key] ?? ''))
    ),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [91, 107, 122], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
  });

  doc.save(`${fileName}-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
};

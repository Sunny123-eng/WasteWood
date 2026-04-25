import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { formatINR } from './format';
import type { ExportDataset } from './excelExport';

export function exportDatasetToPdf(d: ExportDataset, title: string, filename?: string): void {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);

  const totalSales = d.sales.reduce((a, s) => a + s.amount, 0);
  const totalPurchases = d.purchases.reduce((a, p) => a + p.amount, 0);
  const totalExpenses = d.expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  autoTable(doc, {
    startY: 28,
    head: [['Metric', 'Amount']],
    body: [
      ['Total Sales', formatINR(totalSales)],
      ['Total Purchases', formatINR(totalPurchases)],
      ['Total Expenses', formatINR(totalExpenses)],
      ['Net Profit', formatINR(netProfit)],
      ['Sunny Share', formatINR(netProfit * d.settings.sunnyPercent / 100)],
      ['Partner Share', formatINR(netProfit * d.settings.partnerPercent / 100)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [101, 67, 33] },
  });

  const addTable = (heading: string, head: string[][], body: (string | number)[][]) => {
    if (body.length === 0) return;
    doc.addPage();
    doc.setFontSize(14);
    doc.text(heading, 14, 16);
    autoTable(doc, { startY: 22, head, body, theme: 'striped', styles: { fontSize: 8 }, headStyles: { fillColor: [101, 67, 33] } });
  };

  addTable('Sales', [['Date', 'Party', 'Bill', 'Qty', 'Rate', 'Amount', 'Mode']],
    d.sales.map(s => [s.date, s.partyName, s.billNumber, s.quantity, s.rate, formatINR(s.amount), s.paymentMode]));

  addTable('Purchases', [['Date', 'Sawmill', 'Qty', 'Rate', 'Amount', 'Vehicle', 'Mode']],
    d.purchases.map(p => [p.date, p.sawmillName, p.quantity, p.rate, formatINR(p.amount), p.vehicleNumber, p.paymentMode]));

  addTable('Expenses', [['Date', 'Description', 'Amount', 'Paid By', 'Mode']],
    d.expenses.map(e => [e.date, e.description, formatINR(e.amount), e.paidBy, e.paymentMode]));

  addTable('Payments Received', [['Date', 'Party', 'Amount', 'Mode']],
    d.paymentsReceived.map(p => [p.date, p.partyName, formatINR(p.amount), p.paymentMode]));

  addTable('Payments Made', [['Date', 'Sawmill', 'Amount', 'Mode']],
    d.paymentsMade.map(p => [p.date, p.sawmillName, formatINR(p.amount), p.paymentMode]));

  addTable('Withdrawals', [['Date', 'Person', 'Amount', 'Source']],
    d.withdrawals.map(w => [w.date, w.person, formatINR(w.amount), w.source]));

  const blob = doc.output('blob');
  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, filename ?? `wood-trading-${today}.pdf`);
}

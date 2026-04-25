import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type {
  Purchase, Sale, Expense, PaymentReceived, PaymentMade,
  Withdrawal, Sawmill, Party, AppSettings,
} from '@/types';

export interface ExportDataset {
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  paymentsReceived: PaymentReceived[];
  paymentsMade: PaymentMade[];
  withdrawals: Withdrawal[];
  sawmills: Sawmill[];
  parties: Party[];
  settings: AppSettings;
}

function sheetFrom(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
}

export function buildWorkbook(d: ExportDataset): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.sales.map(s => ({
    Date: s.date, Party: s.partyName, Rate: s.rate, Quantity: s.quantity,
    Amount: s.amount, Vehicle: s.vehicleNumber, Bill: s.billNumber,
    PaymentMode: s.paymentMode, Notes: s.notes ?? '',
  }))), 'Sales');

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.purchases.map(p => ({
    Date: p.date, Sawmill: p.sawmillName, Rate: p.rate, Quantity: p.quantity,
    Amount: p.amount, Vehicle: p.vehicleNumber,
    PaymentMode: p.paymentMode, Notes: p.notes ?? '',
  }))), 'Purchases');

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.expenses.map(e => ({
    Date: e.date, Description: e.description, Amount: e.amount,
    PaidBy: e.paidBy, PaymentMode: e.paymentMode, LinkedVehicle: e.linkedVehicle ?? '',
  }))), 'Expenses');

  XLSX.utils.book_append_sheet(wb, sheetFrom([
    ...d.paymentsReceived.map(p => ({
      Type: 'Received', Date: p.date, Counterparty: p.partyName,
      Amount: p.amount, Mode: p.paymentMode, Notes: p.notes ?? '',
    })),
    ...d.paymentsMade.map(p => ({
      Type: 'Made', Date: p.date, Counterparty: p.sawmillName,
      Amount: p.amount, Mode: p.paymentMode, Notes: p.notes ?? '',
    })),
  ]), 'Payments');

  const recv = new Map<string, { name: string; amount: number }>();
  d.sales.filter(s => s.paymentMode === 'credit').forEach(s => {
    const cur = recv.get(s.partyId) ?? { name: s.partyName, amount: 0 };
    cur.amount += s.amount;
    recv.set(s.partyId, cur);
  });
  d.paymentsReceived.forEach(p => {
    const cur = recv.get(p.partyId);
    if (cur) cur.amount -= p.amount;
  });

  const pay = new Map<string, { name: string; amount: number }>();
  d.purchases.filter(p => p.paymentMode === 'credit').forEach(p => {
    const cur = pay.get(p.sawmillId) ?? { name: p.sawmillName, amount: 0 };
    cur.amount += p.amount;
    pay.set(p.sawmillId, cur);
  });
  d.paymentsMade.forEach(p => {
    const cur = pay.get(p.sawmillId);
    if (cur) cur.amount -= p.amount;
  });

  XLSX.utils.book_append_sheet(wb, sheetFrom([
    ...Array.from(recv.values()).filter(v => v.amount > 0).map(v => ({
      Type: 'Receivable', Name: v.name, Amount: v.amount,
    })),
    ...Array.from(pay.values()).filter(v => v.amount > 0).map(v => ({
      Type: 'Payable', Name: v.name, Amount: v.amount,
    })),
  ]), 'Outstanding');

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.withdrawals.map(w => ({
    Date: w.date, Person: w.person, Amount: w.amount,
    Source: w.source, Notes: w.notes ?? '',
  }))), 'Withdrawals');

  const totalSales = d.sales.reduce((a, s) => a + s.amount, 0);
  const totalPurchases = d.purchases.reduce((a, p) => a + p.amount, 0);
  const totalExpenses = d.expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const sunnyExp = d.expenses.filter(e => e.paidBy === 'sunny').reduce((a, e) => a + e.amount, 0);
  const partnerExp = d.expenses.filter(e => e.paidBy === 'partner').reduce((a, e) => a + e.amount, 0);
  const sunnyW = d.withdrawals.filter(w => w.person === 'sunny').reduce((a, w) => a + w.amount, 0);
  const partnerW = d.withdrawals.filter(w => w.person === 'partner').reduce((a, w) => a + w.amount, 0);

  XLSX.utils.book_append_sheet(wb, sheetFrom([
    { Metric: 'Total Sales', Value: totalSales },
    { Metric: 'Total Purchases', Value: totalPurchases },
    { Metric: 'Total Expenses', Value: totalExpenses },
    { Metric: 'Net Profit', Value: netProfit },
    { Metric: 'Sunny %', Value: d.settings.sunnyPercent },
    { Metric: 'Partner %', Value: d.settings.partnerPercent },
    { Metric: 'Sunny Share', Value: netProfit * d.settings.sunnyPercent / 100 },
    { Metric: 'Partner Share', Value: netProfit * d.settings.partnerPercent / 100 },
    { Metric: 'Sunny Expenses Paid', Value: sunnyExp },
    { Metric: 'Partner Expenses Paid', Value: partnerExp },
    { Metric: 'Sunny Withdrawals', Value: sunnyW },
    { Metric: 'Partner Withdrawals', Value: partnerW },
  ]), 'Partner Accounts');

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.sawmills.map(s => ({
    Name: s.name, DefaultRate: s.defaultRate,
  }))), 'Sawmills');

  XLSX.utils.book_append_sheet(wb, sheetFrom(d.parties.map(p => ({
    Name: p.name, Contact: p.contact ?? '',
  }))), 'Parties');

  return wb;
}

export function exportDatasetToExcel(d: ExportDataset, filename?: string): void {
  const wb = buildWorkbook(d);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const today = new Date().toISOString().split('T')[0];
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename ?? `wood-trading-${today}.xlsx`);
}

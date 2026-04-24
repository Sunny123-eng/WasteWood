import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getItem } from '@/lib/storage';
import type {
  Purchase, Sale, Expense, PaymentReceived, PaymentMade,
  Withdrawal, Sawmill, Party,
} from '@/types';

function sheetFrom(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
}

export function exportAllToExcel(): void {
  const purchases = getItem<Purchase[]>('ww_purchases', []);
  const sales = getItem<Sale[]>('ww_sales', []);
  const expenses = getItem<Expense[]>('ww_expenses', []);
  const paymentsReceived = getItem<PaymentReceived[]>('ww_payments_received', []);
  const paymentsMade = getItem<PaymentMade[]>('ww_payments_made', []);
  const withdrawals = getItem<Withdrawal[]>('ww_withdrawals', []);
  const sawmills = getItem<Sawmill[]>('ww_sawmills', []);
  const parties = getItem<Party[]>('ww_parties', []);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheetFrom(sales.map(s => ({
    Date: s.date, Party: s.partyName, Rate: s.rate, Quantity: s.quantity,
    Amount: s.amount, Vehicle: s.vehicleNumber, Bill: s.billNumber,
    PaymentMode: s.paymentMode, Notes: s.notes ?? '',
  }))), 'Sales');

  XLSX.utils.book_append_sheet(wb, sheetFrom(purchases.map(p => ({
    Date: p.date, Sawmill: p.sawmillName, Rate: p.rate, Quantity: p.quantity,
    Amount: p.amount, Vehicle: p.vehicleNumber,
    PaymentMode: p.paymentMode, Notes: p.notes ?? '',
  }))), 'Purchases');

  XLSX.utils.book_append_sheet(wb, sheetFrom(expenses.map(e => ({
    Date: e.date, Description: e.description, Amount: e.amount,
    PaidBy: e.paidBy, PaymentMode: e.paymentMode, LinkedVehicle: e.linkedVehicle ?? '',
  }))), 'Expenses');

  XLSX.utils.book_append_sheet(wb, sheetFrom([
    ...paymentsReceived.map(p => ({
      Type: 'Received', Date: p.date, Counterparty: p.partyName,
      Amount: p.amount, Mode: p.paymentMode, Notes: p.notes ?? '',
    })),
    ...paymentsMade.map(p => ({
      Type: 'Made', Date: p.date, Counterparty: p.sawmillName,
      Amount: p.amount, Mode: p.paymentMode, Notes: p.notes ?? '',
    })),
  ]), 'Payments');

  // Outstanding
  const recv = new Map<string, { name: string; amount: number }>();
  sales.filter(s => s.paymentMode === 'credit').forEach(s => {
    const cur = recv.get(s.partyId) ?? { name: s.partyName, amount: 0 };
    cur.amount += s.amount;
    recv.set(s.partyId, cur);
  });
  paymentsReceived.forEach(p => {
    const cur = recv.get(p.partyId);
    if (cur) cur.amount -= p.amount;
  });

  const pay = new Map<string, { name: string; amount: number }>();
  purchases.filter(p => p.paymentMode === 'credit').forEach(p => {
    const cur = pay.get(p.sawmillId) ?? { name: p.sawmillName, amount: 0 };
    cur.amount += p.amount;
    pay.set(p.sawmillId, cur);
  });
  paymentsMade.forEach(p => {
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

  XLSX.utils.book_append_sheet(wb, sheetFrom(withdrawals.map(w => ({
    Date: w.date, Person: w.person, Amount: w.amount,
    Source: w.source, Notes: w.notes ?? '',
  }))), 'Withdrawals');

  // Partner accounts summary
  const totalSales = sales.reduce((a, s) => a + s.amount, 0);
  const totalPurchases = purchases.reduce((a, p) => a + p.amount, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const sunnyExp = expenses.filter(e => e.paidBy === 'sunny').reduce((a, e) => a + e.amount, 0);
  const partnerExp = expenses.filter(e => e.paidBy === 'partner').reduce((a, e) => a + e.amount, 0);
  const sunnyW = withdrawals.filter(w => w.person === 'sunny').reduce((a, w) => a + w.amount, 0);
  const partnerW = withdrawals.filter(w => w.person === 'partner').reduce((a, w) => a + w.amount, 0);

  const settings = getItem<{ sunnyPercent: number; partnerPercent: number }>('ww_settings', { sunnyPercent: 50, partnerPercent: 50 });

  XLSX.utils.book_append_sheet(wb, sheetFrom([
    { Metric: 'Total Sales', Value: totalSales },
    { Metric: 'Total Purchases', Value: totalPurchases },
    { Metric: 'Total Expenses', Value: totalExpenses },
    { Metric: 'Net Profit', Value: netProfit },
    { Metric: 'Sunny %', Value: settings.sunnyPercent },
    { Metric: 'Partner %', Value: settings.partnerPercent },
    { Metric: 'Sunny Share', Value: netProfit * settings.sunnyPercent / 100 },
    { Metric: 'Partner Share', Value: netProfit * settings.partnerPercent / 100 },
    { Metric: 'Sunny Expenses Paid', Value: sunnyExp },
    { Metric: 'Partner Expenses Paid', Value: partnerExp },
    { Metric: 'Sunny Withdrawals', Value: sunnyW },
    { Metric: 'Partner Withdrawals', Value: partnerW },
  ]), 'Partner Accounts');

  XLSX.utils.book_append_sheet(wb, sheetFrom(sawmills.map(s => ({
    Name: s.name, DefaultRate: s.defaultRate,
  }))), 'Sawmills');

  XLSX.utils.book_append_sheet(wb, sheetFrom(parties.map(p => ({
    Name: p.name, Contact: p.contact ?? '',
  }))), 'Parties');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const today = new Date().toISOString().split('T')[0];
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `wood-trading-${today}.xlsx`);
}

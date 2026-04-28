/**
 * Close-month service: builds a full dataset snapshot from cloud,
 * archives it to monthly_archives table, then resets transactions
 * (preserving balances + unsettled outstanding via opening entries).
 */
import { supabase } from '@/integrations/supabase/client';
import { buildWorkbook, exportDatasetToExcel, type ExportDataset } from './excelExport';
import { exportDatasetToPdf } from './pdfExport';
import { clearMonthlyTransactions } from './backup';
import * as XLSX from 'xlsx';
import type {
  Purchase, Sale, Expense, PaymentReceived, PaymentMade,
  Withdrawal, Sawmill, Party,
} from '@/types';

function map<T>(rows: unknown[] | null, fn: (r: Record<string, unknown>) => T): T[] {
  return (rows ?? []).map(r => fn(r as Record<string, unknown>));
}

export async function fetchExportDataset(businessId: string): Promise<ExportDataset> {
  const [
    sawmills, parties, purchases, sales, expenses,
    pr, pm, withdrawals, settings,
  ] = await Promise.all([
    supabase.from('sawmills').select('*').eq('business_id', businessId),
    supabase.from('parties').select('*').eq('business_id', businessId),
    supabase.from('purchases').select('*').eq('business_id', businessId),
    supabase.from('sales').select('*').eq('business_id', businessId),
    supabase.from('expenses').select('*').eq('business_id', businessId),
    supabase.from('payments_received').select('*').eq('business_id', businessId),
    supabase.from('payments_made').select('*').eq('business_id', businessId),
    supabase.from('withdrawals').select('*').eq('business_id', businessId),
    supabase.from('settings').select('sunny_pct,partner_pct').eq('business_id', businessId).maybeSingle(),
  ]);

  return {
    sawmills: map<Sawmill>(sawmills.data, r => ({
      id: r.id as string, name: r.name as string,
      defaultRate: Number(r.default_rate), createdAt: r.created_at as string,
    })),
    parties: map<Party>(parties.data, r => ({
      id: r.id as string, name: r.name as string,
      contact: (r.contact as string) ?? undefined, createdAt: r.created_at as string,
    })),
    purchases: map<Purchase>(purchases.data, r => ({
      id: r.id as string, date: r.date as string,
      sawmillId: r.sawmill_id as string, sawmillName: r.sawmill_name as string,
      rate: Number(r.rate), quantity: Number(r.quantity), amount: Number(r.amount),
      vehicleNumber: (r.vehicle_number as string) ?? '',
      paymentMode: r.payment_mode as Purchase['paymentMode'],
      notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    })),
    sales: map<Sale>(sales.data, r => ({
      id: r.id as string, date: r.date as string,
      partyId: r.party_id as string, partyName: r.party_name as string,
      rate: Number(r.rate), quantity: Number(r.quantity), amount: Number(r.amount),
      vehicleNumber: (r.vehicle_number as string) ?? '',
      billNumber: r.bill_number as string,
      paymentMode: r.payment_mode as Sale['paymentMode'],
      notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    })),
    expenses: map<Expense>(expenses.data, r => ({
      id: r.id as string, date: r.date as string,
      description: r.description as string, amount: Number(r.amount),
      paidBy: r.paid_by as Expense['paidBy'],
      paymentMode: r.payment_mode as Expense['paymentMode'],
      linkedVehicle: (r.vehicle_number as string) ?? undefined,
      createdAt: r.created_at as string,
    })),
    paymentsReceived: map<PaymentReceived>(pr.data, r => ({
      id: r.id as string, date: r.date as string,
      partyId: r.party_id as string, partyName: r.party_name as string,
      amount: Number(r.amount),
      paymentMode: r.payment_mode as PaymentReceived['paymentMode'],
      notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    })),
    paymentsMade: map<PaymentMade>(pm.data, r => ({
      id: r.id as string, date: r.date as string,
      sawmillId: r.sawmill_id as string, sawmillName: r.sawmill_name as string,
      amount: Number(r.amount),
      paymentMode: r.payment_mode as PaymentMade['paymentMode'],
      notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    })),
    withdrawals: map<Withdrawal>(withdrawals.data, r => ({
      id: r.id as string, date: r.date as string,
      person: r.person as Withdrawal['person'], amount: Number(r.amount),
      source: r.source as Withdrawal['source'],
      notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    })),
    settings: {
      sunnyPercent: Number(settings.data?.sunny_pct ?? 50),
      partnerPercent: Number(settings.data?.partner_pct ?? 50),
    },
  };
}

export interface CloseMonthResult {
  archiveId: string;
  periodLabel: string;
}

/**
 * Archives current dataset to monthly_archives, downloads Excel + PDF copies,
 * then clears transactions while preserving outstanding as opening entries.
 */
export async function closeMonth(businessId: string): Promise<CloseMonthResult> {
  const dataset = await fetchExportDataset(businessId);
  const now = new Date();
  const periodLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const totalSales = dataset.sales.reduce((a, s) => a + s.amount, 0);
  const totalPurchases = dataset.purchases.reduce((a, p) => a + p.amount, 0);
  const totalExpenses = dataset.expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const totals = {
    totalSales, totalPurchases, totalExpenses, netProfit,
    sunnyShare: netProfit * dataset.settings.sunnyPercent / 100,
    partnerShare: netProfit * dataset.settings.partnerPercent / 100,
    counts: {
      sales: dataset.sales.length, purchases: dataset.purchases.length,
      expenses: dataset.expenses.length, paymentsReceived: dataset.paymentsReceived.length,
      paymentsMade: dataset.paymentsMade.length, withdrawals: dataset.withdrawals.length,
    },
  };

  const { data: archive, error: archiveErr } = await supabase
    .from('monthly_archives')
    .insert({
      business_id: businessId,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      data: dataset as never,
      totals: totals as never,
    })
    .select()
    .single();
  if (archiveErr) throw archiveErr;

  // Download Excel + PDF backups
  const safeLabel = periodLabel.replace(/\s+/g, '-').toLowerCase();
  exportDatasetToExcel(dataset, `wood-trading-${safeLabel}.xlsx`);
  exportDatasetToPdf(dataset, `Monthly Report — ${periodLabel}`, `wood-trading-${safeLabel}.pdf`);

  // Reset transactions (preserves outstanding as opening entries)
  await clearMonthlyTransactions(businessId);

  return { archiveId: archive.id, periodLabel };
}

export async function listArchives(businessId: string) {
  const { data, error } = await supabase
    .from('monthly_archives')
    .select('id, period_label, period_start, period_end, totals, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function downloadArchive(archiveId: string, format: 'xlsx' | 'pdf') {
  const { data, error } = await supabase
    .from('monthly_archives')
    .select('period_label, data')
    .eq('id', archiveId)
    .single();
  if (error) throw error;

  const dataset = data.data as unknown as ExportDataset;
  const safeLabel = (data.period_label as string).replace(/\s+/g, '-').toLowerCase();
  if (format === 'xlsx') {
    exportDatasetToExcel(dataset, `archive-${safeLabel}.xlsx`);
  } else {
    exportDatasetToPdf(dataset, `Archive — ${data.period_label}`, `archive-${safeLabel}.pdf`);
  }
}

// Used by buildWorkbook re-export to keep tree-shaking simple
export { buildWorkbook, XLSX };

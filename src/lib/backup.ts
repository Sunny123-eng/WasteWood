import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

const TABLES = [
  'sawmills', 'parties', 'purchases', 'sales', 'expenses',
  'payments_received', 'payments_made', 'withdrawals',
] as const;

interface BackupFile {
  app: 'wood-trading-erp';
  version: 2;
  exportedAt: string;
  data: Record<string, unknown[]>;
  balances: { cash: number; bank: number };
  settings: { sunny_pct: number; partner_pct: number };
}

export async function exportBackup(): Promise<void> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data: rows, error } = await supabase.from(t).select('*');
    if (error) throw error;
    data[t] = rows ?? [];
  }
  const { data: bal } = await supabase.from('balances').select('cash,bank').eq('id', 1).maybeSingle();
  const { data: set } = await supabase.from('settings').select('sunny_pct,partner_pct').eq('id', 1).maybeSingle();

  const payload: BackupFile = {
    app: 'wood-trading-erp',
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
    balances: { cash: Number(bal?.cash ?? 0), bank: Number(bal?.bank ?? 0) },
    settings: { sunny_pct: Number(set?.sunny_pct ?? 50), partner_pct: Number(set?.partner_pct ?? 50) },
  };
  const today = new Date().toISOString().split('T')[0];
  saveAs(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `wood-trading-backup-${today}.json`);
}

/** Restore: deletes existing rows in dependency-safe order, then re-inserts. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  if (parsed.app !== 'wood-trading-erp') throw new Error('Invalid backup file');

  // Delete in reverse dependency order (transactions before masters)
  const deleteOrder = [
    'payments_made', 'payments_received', 'withdrawals',
    'expenses', 'sales', 'purchases', 'parties', 'sawmills',
  ] as const;
  for (const t of deleteOrder) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  // Insert masters first then transactions
  const insertOrder = [
    'sawmills', 'parties', 'purchases', 'sales', 'expenses',
    'payments_received', 'payments_made', 'withdrawals',
  ] as const;
  for (const t of insertOrder) {
    const rows = parsed.data[t];
    if (rows && rows.length) {
      const { error } = await supabase.from(t).insert(rows as never);
      if (error) throw error;
    }
  }

  if (parsed.balances) {
    await supabase.from('balances').update({
      cash: parsed.balances.cash, bank: parsed.balances.bank,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
  }
  if (parsed.settings) {
    await supabase.from('settings').update({
      sunny_pct: parsed.settings.sunny_pct, partner_pct: parsed.settings.partner_pct,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
  }
}

/** Clears ALL data including masters & resets balances. */
export async function clearAllData(): Promise<void> {
  const order = [
    'payments_made', 'payments_received', 'withdrawals',
    'expenses', 'sales', 'purchases', 'parties', 'sawmills',
  ] as const;
  for (const t of order) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }
  await supabase.from('balances').update({ cash: 0, bank: 0, updated_at: new Date().toISOString() }).eq('id', 1);
}

/**
 * Close-month: clears only transactions, keeps masters (sawmills, parties),
 * keeps balances and unsettled outstanding (credit sales/purchases minus
 * their payments). Done by re-inserting outstanding-only credit rows.
 */
export async function clearMonthlyTransactions(): Promise<void> {
  // Compute outstanding receivables/payables before wiping
  const { data: salesRows } = await supabase.from('sales').select('*');
  const { data: prRows } = await supabase.from('payments_received').select('*');
  const { data: purchaseRows } = await supabase.from('purchases').select('*');
  const { data: pmRows } = await supabase.from('payments_made').select('*');

  // Net outstanding per party
  const partyOutstanding = new Map<string, { name: string; amount: number }>();
  (salesRows ?? []).filter(s => s.payment_mode === 'credit').forEach(s => {
    const cur = partyOutstanding.get(s.party_id) ?? { name: s.party_name, amount: 0 };
    cur.amount += Number(s.amount);
    partyOutstanding.set(s.party_id, cur);
  });
  (prRows ?? []).forEach(p => {
    const cur = partyOutstanding.get(p.party_id);
    if (cur) cur.amount -= Number(p.amount);
  });

  const sawmillOutstanding = new Map<string, { name: string; amount: number }>();
  (purchaseRows ?? []).filter(p => p.payment_mode === 'credit').forEach(p => {
    const cur = sawmillOutstanding.get(p.sawmill_id) ?? { name: p.sawmill_name, amount: 0 };
    cur.amount += Number(p.amount);
    sawmillOutstanding.set(p.sawmill_id, cur);
  });
  (pmRows ?? []).forEach(p => {
    const cur = sawmillOutstanding.get(p.sawmill_id);
    if (cur) cur.amount -= Number(p.amount);
  });

  // Wipe transactions
  const order = [
    'payments_made', 'payments_received', 'withdrawals',
    'expenses', 'sales', 'purchases',
  ] as const;
  for (const t of order) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  // Re-insert opening-balance entries for unsettled outstanding so user
  // doesn't lose track of who owes what.
  const today = new Date().toISOString().split('T')[0];
  const openingSales = Array.from(partyOutstanding.entries())
    .filter(([, v]) => v.amount > 0.01)
    .map(([party_id, v]) => ({
      date: today, party_id, party_name: v.name,
      bill_number: 'OPENING', rate: 0, quantity: 0,
      amount: v.amount, payment_mode: 'credit',
      notes: 'Opening balance from previous month',
    }));
  if (openingSales.length) {
    const { error } = await supabase.from('sales').insert(openingSales as never);
    if (error) throw error;
  }

  const openingPurchases = Array.from(sawmillOutstanding.entries())
    .filter(([, v]) => v.amount > 0.01)
    .map(([sawmill_id, v]) => ({
      date: today, sawmill_id, sawmill_name: v.name,
      rate: 0, quantity: 0, amount: v.amount,
      payment_mode: 'credit',
      notes: 'Opening balance from previous month',
    }));
  if (openingPurchases.length) {
    const { error } = await supabase.from('purchases').insert(openingPurchases as never);
    if (error) throw error;
  }
}

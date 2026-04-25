/**
 * Central cloud data store. Loads all tables once after auth, keeps them
 * in memory, and re-fetches the affected table on each mutation. Exposes
 * a per-table API matching the old `useStore` shape so existing pages
 * keep working with minimal edits.
 *
 * Mutation gating: any add/update/remove is rejected for non-admins.
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  Sawmill, Party, Purchase, Sale, Expense,
  PaymentReceived, PaymentMade, Withdrawal, Balances, AppSettings,
} from '@/types';
import { toast } from 'sonner';

export type StoreKey =
  | 'ww_sawmills' | 'ww_parties' | 'ww_purchases' | 'ww_sales' | 'ww_expenses'
  | 'ww_payments_received' | 'ww_payments_made' | 'ww_withdrawals';

const KEY_TO_TABLE: Record<StoreKey, string> = {
  ww_sawmills: 'sawmills',
  ww_parties: 'parties',
  ww_purchases: 'purchases',
  ww_sales: 'sales',
  ww_expenses: 'expenses',
  ww_payments_received: 'payments_received',
  ww_payments_made: 'payments_made',
  ww_withdrawals: 'withdrawals',
};

// Maps app/camelCase fields <-> DB/snake_case fields per table.
type FieldMap = Record<string, string>; // appKey -> dbKey
const FIELD_MAPS: Record<StoreKey, FieldMap> = {
  ww_sawmills: { defaultRate: 'default_rate', createdAt: 'created_at' },
  ww_parties: { createdAt: 'created_at' },
  ww_purchases: {
    sawmillId: 'sawmill_id', sawmillName: 'sawmill_name',
    vehicleNumber: 'vehicle_number', paymentMode: 'payment_mode',
    createdAt: 'created_at',
  },
  ww_sales: {
    partyId: 'party_id', partyName: 'party_name',
    vehicleNumber: 'vehicle_number', billNumber: 'bill_number',
    paymentMode: 'payment_mode', createdAt: 'created_at',
  },
  ww_expenses: {
    paidBy: 'paid_by', paymentMode: 'payment_mode',
    linkedVehicle: 'vehicle_number', createdAt: 'created_at',
  },
  ww_payments_received: {
    partyId: 'party_id', partyName: 'party_name',
    paymentMode: 'payment_mode', createdAt: 'created_at',
  },
  ww_payments_made: {
    sawmillId: 'sawmill_id', sawmillName: 'sawmill_name',
    paymentMode: 'payment_mode', createdAt: 'created_at',
  },
  ww_withdrawals: { createdAt: 'created_at' },
};

function toDb(key: StoreKey, app: Record<string, unknown>): Record<string, unknown> {
  const map = FIELD_MAPS[key];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(app)) {
    if (v === undefined) continue;
    out[map[k] ?? k] = v;
  }
  return out;
}

function fromDb(key: StoreKey, row: Record<string, unknown>): Record<string, unknown> {
  const map = FIELD_MAPS[key];
  const reverse: FieldMap = {};
  for (const [appKey, dbKey] of Object.entries(map)) reverse[dbKey] = appKey;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[reverse[k] ?? k] = v;
  }
  return out;
}

interface DataState {
  ww_sawmills: Sawmill[];
  ww_parties: Party[];
  ww_purchases: Purchase[];
  ww_sales: Sale[];
  ww_expenses: Expense[];
  ww_payments_received: PaymentReceived[];
  ww_payments_made: PaymentMade[];
  ww_withdrawals: Withdrawal[];
  balances: Balances;
  settings: AppSettings;
  loading: boolean;
}

interface DataCtx extends DataState {
  refreshKey: (key: StoreKey) => Promise<void>;
  addItem: <T>(key: StoreKey, item: Record<string, unknown>) => Promise<T | null>;
  updateItem: (key: StoreKey, id: string, patch: Record<string, unknown>) => Promise<boolean>;
  removeItem: (key: StoreKey, id: string) => Promise<boolean>;
  setBalance: (mode: 'cash' | 'bank', delta: number) => Promise<void>;
  saveSettings: (next: AppSettings) => Promise<boolean>;
  refreshBalances: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const EMPTY: DataState = {
  ww_sawmills: [], ww_parties: [], ww_purchases: [], ww_sales: [],
  ww_expenses: [], ww_payments_received: [], ww_payments_made: [],
  ww_withdrawals: [],
  balances: { cash: 0, bank: 0 },
  settings: { sunnyPercent: 50, partnerPercent: 50 },
  loading: true,
};

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState<DataState>(EMPTY);

  const fetchTable = useCallback(async (key: StoreKey) => {
    const table = KEY_TO_TABLE[key];
    const { data, error } = await supabase
      .from(table as never)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error(`Fetch ${table} failed`, error);
      return;
    }
    const items = (data ?? []).map(r => fromDb(key, r as Record<string, unknown>));
    setState(s => ({ ...s, [key]: items as never }));
  }, []);

  const refreshBalances = useCallback(async () => {
    const { data } = await supabase.from('balances').select('cash,bank').eq('id', 1).maybeSingle();
    if (data) setState(s => ({ ...s, balances: { cash: Number(data.cash), bank: Number(data.bank) } }));
  }, []);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('sunny_pct,partner_pct').eq('id', 1).maybeSingle();
    if (data) setState(s => ({ ...s, settings: { sunnyPercent: Number(data.sunny_pct), partnerPercent: Number(data.partner_pct) } }));
  }, []);

  const loadAll = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    await Promise.all([
      ...Object.keys(KEY_TO_TABLE).map(k => fetchTable(k as StoreKey)),
      refreshBalances(),
      refreshSettings(),
    ]);
    setState(s => ({ ...s, loading: false }));
  }, [fetchTable, refreshBalances, refreshSettings]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { setState(EMPTY); return; }
    loadAll();
  }, [session, authLoading, loadAll]);

  const guardAdmin = useCallback((action: string): boolean => {
    if (!isAdmin) {
      toast.error(`Only admins can ${action}`);
      return false;
    }
    return true;
  }, [isAdmin]);

  const addItem = useCallback(async <T,>(key: StoreKey, item: Record<string, unknown>): Promise<T | null> => {
    if (!guardAdmin('add records')) return null;
    const table = KEY_TO_TABLE[key];
    const dbRow = toDb(key, item);
    const { data, error } = await supabase
      .from(table as never)
      .insert(dbRow as never)
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    await fetchTable(key);
    return fromDb(key, data as Record<string, unknown>) as T;
  }, [guardAdmin, fetchTable]);

  const updateItem = useCallback(async (key: StoreKey, id: string, patch: Record<string, unknown>): Promise<boolean> => {
    if (!guardAdmin('edit records')) return false;
    const table = KEY_TO_TABLE[key];
    const dbPatch = toDb(key, patch);
    const { error } = await supabase
      .from(table as never)
      .update(dbPatch as never)
      .eq('id', id);
    if (error) { toast.error(error.message); return false; }
    await fetchTable(key);
    return true;
  }, [guardAdmin, fetchTable]);

  const removeItem = useCallback(async (key: StoreKey, id: string): Promise<boolean> => {
    if (!guardAdmin('delete records')) return false;
    const table = KEY_TO_TABLE[key];
    const { error } = await supabase.from(table as never).delete().eq('id', id);
    if (error) { toast.error(error.message); return false; }
    await fetchTable(key);
    return true;
  }, [guardAdmin, fetchTable]);

  const setBalance = useCallback(async (mode: 'cash' | 'bank', delta: number) => {
    if (!isAdmin) return;
    const { data: cur } = await supabase.from('balances').select('cash,bank').eq('id', 1).maybeSingle();
    const next = { cash: Number(cur?.cash ?? 0), bank: Number(cur?.bank ?? 0) };
    next[mode] += delta;
    const { error } = await supabase.from('balances').update({ cash: next.cash, bank: next.bank, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) { toast.error(error.message); return; }
    setState(s => ({ ...s, balances: next }));
  }, [isAdmin]);

  const saveSettings = useCallback(async (next: AppSettings): Promise<boolean> => {
    if (!guardAdmin('change settings')) return false;
    const { error } = await supabase.from('settings').update({
      sunny_pct: next.sunnyPercent, partner_pct: next.partnerPercent,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    if (error) { toast.error(error.message); return false; }
    setState(s => ({ ...s, settings: next }));
    return true;
  }, [guardAdmin]);

  const value = useMemo<DataCtx>(() => ({
    ...state,
    refreshKey: fetchTable,
    addItem, updateItem, removeItem,
    setBalance, saveSettings, refreshBalances,
  }), [state, fetchTable, addItem, updateItem, removeItem, setBalance, saveSettings, refreshBalances]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDataStore must be used within DataStoreProvider');
  return v;
}

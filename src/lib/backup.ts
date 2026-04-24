import { saveAs } from 'file-saver';

const KEYS = [
  'ww_sawmills', 'ww_parties', 'ww_purchases', 'ww_sales', 'ww_expenses',
  'ww_payments_received', 'ww_payments_made', 'ww_withdrawals',
  'ww_balances', 'ww_settings',
];

interface BackupFile {
  app: 'wood-trading-erp';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportBackup(): void {
  const data: Record<string, unknown> = {};
  KEYS.forEach(k => {
    const raw = localStorage.getItem(k);
    data[k] = raw ? JSON.parse(raw) : null;
  });
  const payload: BackupFile = {
    app: 'wood-trading-erp',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  const today = new Date().toISOString().split('T')[0];
  saveAs(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `wood-trading-backup-${today}.json`);
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  if (parsed.app !== 'wood-trading-erp') {
    throw new Error('Invalid backup file');
  }
  Object.entries(parsed.data).forEach(([k, v]) => {
    if (KEYS.includes(k) && v !== null) {
      localStorage.setItem(k, JSON.stringify(v));
    }
  });
}

export function clearAllData(): void {
  KEYS.forEach(k => localStorage.removeItem(k));
}

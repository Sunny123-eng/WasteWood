import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/format';
import { getItem, setItem } from '@/lib/storage';
import type { Purchase, Sale, Expense, Withdrawal, AppSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const SETTINGS_KEY = 'ww_settings';
const DEFAULT_SETTINGS: AppSettings = { sunnyPercent: 50, partnerPercent: 50 };

export default function ProfitSettlement() {
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: withdrawals } = useStore<Withdrawal>('ww_withdrawals');

  const [settings, setSettings] = useState<AppSettings>(() => getItem(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [sunnyInput, setSunnyInput] = useState(settings.sunnyPercent.toString());
  const [partnerInput, setPartnerInput] = useState(settings.partnerPercent.toString());

  function saveSettings() {
    const sunny = Number(sunnyInput);
    const partner = Number(partnerInput);
    if (sunny + partner !== 100) {
      toast.error('Percentages must add up to 100%');
      return;
    }
    const next = { sunnyPercent: sunny, partnerPercent: partner };
    setSettings(next);
    setItem(SETTINGS_KEY, next);
    toast.success('Profit split updated');
  }

  const totals = useMemo(() => {
    const totalSales = sales.reduce((a, s) => a + s.amount, 0);
    const totalPurchases = purchases.reduce((a, p) => a + p.amount, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    const sunnyShare = netProfit * (settings.sunnyPercent / 100);
    const partnerShare = netProfit * (settings.partnerPercent / 100);

    // Expenses paid by each person (they paid from their pocket, business owes them)
    const sunnyExpenses = expenses.filter(e => e.paidBy === 'sunny').reduce((a, e) => a + e.amount, 0);
    const partnerExpenses = expenses.filter(e => e.paidBy === 'partner').reduce((a, e) => a + e.amount, 0);

    // Withdrawals by each person
    const sunnyWithdrawals = withdrawals.filter(w => w.person === 'sunny').reduce((a, w) => a + w.amount, 0);
    const partnerWithdrawals = withdrawals.filter(w => w.person === 'partner').reduce((a, w) => a + w.amount, 0);

    // Net position: share + expenses_paid - withdrawals
    // Positive means business owes them, negative means they owe business
    const sunnyNet = sunnyShare + sunnyExpenses - sunnyWithdrawals;
    const partnerNet = partnerShare + partnerExpenses - partnerWithdrawals;

    return {
      totalSales, totalPurchases, totalExpenses, netProfit,
      sunnyShare, partnerShare,
      sunnyExpenses, partnerExpenses,
      sunnyWithdrawals, partnerWithdrawals,
      sunnyNet, partnerNet,
    };
  }, [sales, purchases, expenses, withdrawals, settings]);

  // Settlement: who owes whom
  const settlement = useMemo(() => {
    const diff = totals.sunnyNet - totals.partnerNet;
    if (Math.abs(diff) < 1) return 'Settled — no dues';
    if (diff > 0) return `Partner owes Sunny ${formatCurrency(Math.abs(diff / 2))}`;
    return `Sunny owes Partner ${formatCurrency(Math.abs(diff / 2))}`;
  }, [totals]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Profit & Settlement</h1>

      {/* Profit Overview */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profit Overview</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Total Sales" value={totals.totalSales} color="text-success" />
          <Row label="Total Purchases" value={-totals.totalPurchases} color="text-destructive" />
          <Row label="Total Expenses" value={-totals.totalExpenses} color="text-destructive" />
          <Separator />
          <Row label="Net Profit" value={totals.netProfit} color={totals.netProfit >= 0 ? 'text-success' : 'text-destructive'} bold />
        </CardContent>
      </Card>

      {/* Profit Split Config */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profit Split</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sunny %</Label>
              <Input type="number" inputMode="numeric" value={sunnyInput} onChange={e => setSunnyInput(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Partner %</Label>
              <Input type="number" inputMode="numeric" value={partnerInput} onChange={e => setPartnerInput(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveSettings} size="sm" className="w-full">Save Split</Button>
        </CardContent>
      </Card>

      {/* Partner Accounts */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sunny</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Share" value={totals.sunnyShare} size="sm" />
            <Row label="Expenses Paid" value={totals.sunnyExpenses} size="sm" color="text-success" />
            <Row label="Withdrawals" value={-totals.sunnyWithdrawals} size="sm" color="text-destructive" />
            <Separator />
            <Row label="Net" value={totals.sunnyNet} size="sm" bold color={totals.sunnyNet >= 0 ? 'text-success' : 'text-destructive'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Partner</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Share" value={totals.partnerShare} size="sm" />
            <Row label="Expenses Paid" value={totals.partnerExpenses} size="sm" color="text-success" />
            <Row label="Withdrawals" value={-totals.partnerWithdrawals} size="sm" color="text-destructive" />
            <Separator />
            <Row label="Net" value={totals.partnerNet} size="sm" bold color={totals.partnerNet >= 0 ? 'text-success' : 'text-destructive'} />
          </CardContent>
        </Card>
      </div>

      {/* Settlement */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Settlement</p>
          <p className="font-bold text-lg">{settlement}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, color, bold, size }: { label: string; value: number; color?: string; bold?: boolean; size?: 'sm' }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{label}</span>
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${bold ? 'font-bold' : 'font-medium'} ${color || ''}`}>
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import type { Purchase, Sale, Expense, Withdrawal, Partner } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { Crown, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfitSettlement() {
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: withdrawals } = useStore<Withdrawal>('ww_withdrawals');
  const { items: partners } = useStore<Partner>('ww_partners');
  const { isBusinessAdmin } = useAuth();
  const navigate = useNavigate();

  const totals = useMemo(() => {
    const totalSales = sales.reduce((a, s) => a + s.amount, 0);
    const totalPurchases = purchases.reduce((a, p) => a + p.amount, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;
    return { totalSales, totalPurchases, totalExpenses, netProfit };
  }, [sales, purchases, expenses]);

  const totalSharePct = useMemo(
    () => partners.reduce((a, p) => a + Number(p.profitSharePercentage || 0), 0),
    [partners],
  );

  const perPartner = useMemo(() => {
    return partners.map(p => {
      const pct = Number(p.profitSharePercentage || 0);
      const share = totals.netProfit * pct / 100;
      const paidExpenses = expenses
        .filter(e => e.paidBy === p.id)
        .reduce((a, e) => a + e.amount, 0);
      const took = withdrawals
        .filter(w => w.person === p.id)
        .reduce((a, w) => a + w.amount, 0);
      const net = share + paidExpenses - took;
      return { partner: p, pct, share, paidExpenses, withdrawals: took, net };
    });
  }, [partners, totals.netProfit, expenses, withdrawals]);

  const settlement = useMemo(() => {
    if (perPartner.length < 2) return null;
    const sorted = [...perPartner].sort((a, b) => b.net - a.net);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const diff = top.net - bottom.net;
    if (Math.abs(diff) < 1) return 'All partners settled';
    return `${bottom.partner.partnerName} owes ${top.partner.partnerName} ${formatCurrency(diff / 2)}`;
  }, [perPartner]);

  const shareWarning = Math.abs(totalSharePct - 100) > 0.01;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Profit & Settlement</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profit Overview</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Total Sales" value={totals.totalSales} color="text-success" />
          <Row label="Total Purchases" value={-totals.totalPurchases} color="text-destructive" />
          <Row label="Total Expenses" value={-totals.totalExpenses} color="text-destructive" />
          <Separator />
          <Row label="Net Profit" value={totals.netProfit}
            color={totals.netProfit >= 0 ? 'text-success' : 'text-destructive'} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Profit Split
          </CardTitle>
          {isBusinessAdmin && (
            <Button size="sm" variant="outline" onClick={() => navigate('/partners')}>
              Manage Partners
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {shareWarning && (
            <p className="text-xs text-destructive">
              ⚠ Partner percentages total {totalSharePct.toFixed(2)}% (should be 100%).
            </p>
          )}
          {partners.length === 0 && (
            <p className="text-sm text-muted-foreground">No partners yet.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {perPartner.map(({ partner, pct, share, paidExpenses, withdrawals: w, net }) => (
              <Card key={partner.id} className="border">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    {partner.isOwner && <Crown className="h-3 w-3 text-warning" />}
                    <span className="truncate">{partner.partnerName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{pct.toFixed(2)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 px-3 pb-3 text-sm">
                  <Row label="Share" value={share} size="sm" />
                  <Row label="Expenses Paid" value={paidExpenses} size="sm" color="text-success" />
                  <Row label="Withdrawals" value={-w} size="sm" color="text-destructive" />
                  <Separator />
                  <Row label="Net" value={net} size="sm" bold
                    color={net >= 0 ? 'text-success' : 'text-destructive'} />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {settlement && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Settlement</p>
            <p className="font-bold text-lg">{settlement}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, color, bold, size }: { label: string; value: number; color?: string; bold?: boolean; size?: 'sm' }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{label}</span>
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${bold ? 'font-bold' : 'font-medium'} ${color || ''}`}>
        {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

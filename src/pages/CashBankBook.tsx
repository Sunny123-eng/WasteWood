import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Wallet, Landmark } from 'lucide-react';
import type {
  Purchase, Sale, Expense, PaymentReceived, PaymentMade, Withdrawal, Partner,
} from '@/types';

type Row = {
  id: string;
  date: string;
  description: string;
  inflow: number;
  outflow: number;
  kind: string;
};

export default function CashBankBook() {
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: pr } = useStore<PaymentReceived>('ww_payments_received');
  const { items: pm } = useStore<PaymentMade>('ww_payments_made');
  const { items: wd } = useStore<Withdrawal>('ww_withdrawals');
  const { items: partners } = useStore<Partner>('ww_partners');
  const { balances } = useBalances();
  const [tab, setTab] = useState<'cash' | 'bank'>('cash');

  const partnerName = (id: string) => partners.find(p => p.id === id)?.partnerName ?? id;

  const buildRows = (mode: 'cash' | 'bank'): Row[] => {
    const rows: Row[] = [];
    sales.filter(s => s.paymentMode === mode).forEach(s => rows.push({
      id: `s-${s.id}`, date: s.date, kind: 'Sale',
      description: `Sale — ${s.partyName} (${s.quantity}KG × ₹${s.rate})`,
      inflow: s.amount, outflow: 0,
    }));
    pr.filter(p => p.paymentMode === mode).forEach(p => rows.push({
      id: `pr-${p.id}`, date: p.date, kind: 'Payment In',
      description: `Payment Received — ${p.partyName}`,
      inflow: p.amount, outflow: 0,
    }));
    purchases.filter(p => p.paymentMode === mode).forEach(p => rows.push({
      id: `p-${p.id}`, date: p.date, kind: 'Purchase',
      description: `Purchase — ${p.sawmillName} (${p.quantity}KG × ₹${p.rate})`,
      inflow: 0, outflow: p.amount,
    }));
    pm.filter(p => p.paymentMode === mode).forEach(p => rows.push({
      id: `pm-${p.id}`, date: p.date, kind: 'Payment Out',
      description: `Payment Made — ${p.sawmillName}`,
      inflow: 0, outflow: p.amount,
    }));
    expenses.filter(e => e.paymentMode === mode).forEach(e => rows.push({
      id: `e-${e.id}`, date: e.date, kind: 'Expense',
      description: `Expense — ${e.description} (by ${e.paidBy === 'business' ? 'Business' : partnerName(e.paidBy)})`,
      inflow: 0, outflow: e.amount,
    }));
    wd.filter(w => w.source === mode).forEach(w => rows.push({
      id: `w-${w.id}`, date: w.date, kind: 'Withdrawal',
      description: `Withdrawal — ${partnerName(w.person)}`,
      inflow: 0, outflow: w.amount,
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    return rows;
  };

  const { cashRows, bankRows, cashTotals, bankTotals } = useMemo(() => {
    const c = buildRows('cash');
    const b = buildRows('bank');
    const tot = (rs: Row[]) => ({
      inflow: rs.reduce((a, r) => a + r.inflow, 0),
      outflow: rs.reduce((a, r) => a + r.outflow, 0),
    });
    return { cashRows: c, bankRows: b, cashTotals: tot(c), bankTotals: tot(b) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, purchases, expenses, pr, pm, wd, partners]);

  const renderBook = (rows: Row[], totals: { inflow: number; outflow: number }, currentBal: number, mode: 'cash' | 'bank') => {
    // running balance starts from (currentBal - net) so it ends at currentBal
    let running = currentBal - (totals.inflow - totals.outflow);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Inflow</p>
            <p className="text-sm font-bold text-success">{formatCurrency(totals.inflow)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Outflow</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(totals.outflow)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{mode === 'cash' ? 'Cash' : 'Bank'} Balance</p>
            <p className={`text-sm font-bold ${currentBal >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(currentBal)}</p>
          </CardContent></Card>
        </div>

        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No {mode} transactions</p>
          ) : rows.map(r => {
            running += r.inflow - r.outflow;
            return (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`mt-0.5 rounded-full p-1 ${r.inflow > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.inflow > 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {r.inflow > 0 && <p className="text-sm font-semibold text-success">+{formatCurrency(r.inflow)}</p>}
                      {r.outflow > 0 && <p className="text-sm font-semibold text-destructive">-{formatCurrency(r.outflow)}</p>}
                      <Badge variant="secondary" className="text-[10px]">Bal {formatCurrency(running)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Cash & Bank Book</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'cash' | 'bank')}>
        <TabsList className="grid w-full grid-cols-2 mb-3">
          <TabsTrigger value="cash"><Wallet className="h-4 w-4 mr-1" />Cash Book</TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="h-4 w-4 mr-1" />Bank Book</TabsTrigger>
        </TabsList>
        <TabsContent value="cash">{renderBook(cashRows, cashTotals, balances.cash, 'cash')}</TabsContent>
        <TabsContent value="bank">{renderBook(bankRows, bankTotals, balances.bank, 'bank')}</TabsContent>
      </Tabs>
    </div>
  );
}

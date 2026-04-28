import { useParams } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase, Sale, PaymentReceived, PaymentMade, Party, Sawmill } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function Ledger() {
  const { type, id } = useParams<{ type: string; id: string }>();

  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const { items: parties } = useStore<Party>('ww_parties');
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');

  const isParty = type === 'party';

  const name = isParty
    ? parties.find(p => p.id === id)?.name ?? 'Unknown Party'
    : sawmills.find(s => s.id === id)?.name ?? 'Unknown Sawmill';

  const ledgerEntries = useMemo(() => {
    type Entry = { id: string; date: string; description: string; debit: number; credit: number; mode: string };
    const entries: Entry[] = [];

    if (isParty) {
      sales.filter(s => s.partyId === id).forEach(s => {
        entries.push({
          id: s.id, date: s.date,
          description: `Sale - ${s.quantity} KG × ₹${s.rate} (Bill #${s.billNumber})`,
          debit: s.paymentMode === 'credit' ? s.amount : 0,
          credit: s.paymentMode !== 'credit' ? s.amount : 0,
          mode: s.paymentMode,
        });
      });
      paymentsReceived.filter(p => p.partyId === id).forEach(p => {
        entries.push({
          id: p.id, date: p.date,
          description: `Payment Received`,
          debit: 0, credit: p.amount,
          mode: p.paymentMode,
        });
      });
    } else {
      purchases.filter(p => p.sawmillId === id).forEach(p => {
        entries.push({
          id: p.id, date: p.date,
          description: `Purchase - ${p.quantity} KG × ₹${p.rate} (${p.vehicleNumber})`,
          debit: p.paymentMode !== 'credit' ? p.amount : 0,
          credit: p.paymentMode === 'credit' ? p.amount : 0,
          mode: p.paymentMode,
        });
      });
      paymentsMade.filter(p => p.sawmillId === id).forEach(p => {
        entries.push({
          id: p.id, date: p.date,
          description: `Payment Made`,
          debit: p.amount, credit: 0,
          mode: p.paymentMode,
        });
      });
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }, [isParty, id, sales, purchases, paymentsReceived, paymentsMade]);

  const totals = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((a, e) => a + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((a, e) => a + e.credit, 0);
    return { debit: totalDebit, credit: totalCredit, balance: isParty ? totalDebit - totalCredit : totalCredit - totalDebit };
  }, [ledgerEntries, isParty]);

  // Payment breakdown by mode (cash/bank)
  const paymentBreakdown = useMemo(() => {
    if (isParty) {
      const list = paymentsReceived.filter(p => p.partyId === id);
      return {
        cash: list.filter(p => p.paymentMode === 'cash').reduce((a, p) => a + p.amount, 0),
        bank: list.filter(p => p.paymentMode === 'bank').reduce((a, p) => a + p.amount, 0),
        total: list.reduce((a, p) => a + p.amount, 0),
      };
    }
    const list = paymentsMade.filter(p => p.sawmillId === id);
    return {
      cash: list.filter(p => p.paymentMode === 'cash').reduce((a, p) => a + p.amount, 0),
      bank: list.filter(p => p.paymentMode === 'bank').reduce((a, p) => a + p.amount, 0),
      total: list.reduce((a, p) => a + p.amount, 0),
    };
  }, [isParty, id, paymentsReceived, paymentsMade]);

  // For parties: totalQty from sales; for sawmills: from purchases
  const totalQty = isParty
    ? sales.filter(s => s.partyId === id).reduce((a, s) => a + s.quantity, 0)
    : purchases.filter(p => p.sawmillId === id).reduce((a, p) => a + p.quantity, 0);

  const totalAmount = isParty
    ? sales.filter(s => s.partyId === id).reduce((a, s) => a + s.amount, 0)
    : purchases.filter(p => p.sawmillId === id).reduce((a, p) => a + p.amount, 0);

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-bold">{name}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{isParty ? 'Party' : 'Sawmill'} Ledger</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total Qty</p>
          <p className="text-sm font-bold">{totalQty.toLocaleString('en-IN')} KG</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total {isParty ? 'Sales' : 'Purchase'}</p>
          <p className="text-sm font-bold">{formatCurrency(totalAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{isParty ? 'To Receive' : 'To Pay'}</p>
          <p className={`text-sm font-bold ${totals.balance > 0 ? (isParty ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}`}>
            {totals.balance > 0 ? formatCurrency(totals.balance) : 'Settled'}
          </p>
        </CardContent></Card>
      </div>

      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">{isParty ? 'Received Cash' : 'Paid Cash'}</p>
            <p className="text-sm font-bold">{formatCurrency(paymentBreakdown.cash)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{isParty ? 'Received Bank' : 'Paid Bank'}</p>
            <p className="text-sm font-bold">{formatCurrency(paymentBreakdown.bank)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total Payments</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(paymentBreakdown.total)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {ledgerEntries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No transactions found</p>
        ) : ledgerEntries.map(entry => (
          <Card key={entry.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={`mt-0.5 rounded-full p-1 ${entry.credit > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.credit > 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {entry.debit > 0 && <p className="text-sm font-semibold text-destructive">-{formatCurrency(entry.debit)}</p>}
                  {entry.credit > 0 && <p className="text-sm font-semibold text-success">+{formatCurrency(entry.credit)}</p>}
                  <Badge variant="secondary" className="text-[10px]">{entry.mode}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

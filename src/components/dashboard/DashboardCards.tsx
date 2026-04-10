import { Card, CardContent } from '@/components/ui/card';
import { useBalances } from '@/hooks/useBalances';
import { useStore } from '@/hooks/useStore';
import { formatCurrency, todayString } from '@/lib/format';
import type { Purchase, Sale, Expense, PaymentReceived, PaymentMade } from '@/types';
import { Wallet, Landmark, ShoppingCart, TrendingUp, Receipt, CreditCard } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardCards() {
  const { balances } = useBalances();
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const navigate = useNavigate();

  const today = todayString();
  const todayPurchases = purchases.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
  const todaySales = sales.filter(s => s.date === today).reduce((a, s) => a + s.amount, 0);
  const todayExpenses = expenses.filter(e => e.date === today).reduce((a, e) => a + e.amount, 0);

  const { totalReceivable, totalPayable } = useMemo(() => {
    const creditSalesByParty = new Map<string, number>();
    sales.filter(s => s.paymentMode === 'credit').forEach(s => {
      creditSalesByParty.set(s.partyId, (creditSalesByParty.get(s.partyId) || 0) + s.amount);
    });
    paymentsReceived.forEach(p => {
      creditSalesByParty.set(p.partyId, (creditSalesByParty.get(p.partyId) || 0) - p.amount);
    });
    const totalReceivable = Array.from(creditSalesByParty.values()).filter(v => v > 0).reduce((a, v) => a + v, 0);

    const creditPurchasesBySawmill = new Map<string, number>();
    purchases.filter(p => p.paymentMode === 'credit').forEach(p => {
      creditPurchasesBySawmill.set(p.sawmillId, (creditPurchasesBySawmill.get(p.sawmillId) || 0) + p.amount);
    });
    paymentsMade.forEach(p => {
      creditPurchasesBySawmill.set(p.sawmillId, (creditPurchasesBySawmill.get(p.sawmillId) || 0) - p.amount);
    });
    const totalPayable = Array.from(creditPurchasesBySawmill.values()).filter(v => v > 0).reduce((a, v) => a + v, 0);

    return { totalReceivable, totalPayable };
  }, [sales, purchases, paymentsReceived, paymentsMade]);

  const cards = [
    { label: 'Cash Balance', value: balances.cash, icon: Wallet, color: 'text-primary' },
    { label: 'Bank Balance', value: balances.bank, icon: Landmark, color: 'text-accent' },
    { label: "Today's Purchases", value: todayPurchases, icon: ShoppingCart, color: 'text-destructive' },
    { label: "Today's Sales", value: todaySales, icon: TrendingUp, color: 'text-success' },
    { label: "Today's Expenses", value: todayExpenses, icon: Receipt, color: 'text-warning' },
    { label: 'Receivable', value: totalReceivable, icon: CreditCard, color: 'text-success', onClick: () => navigate('/outstanding') },
    { label: 'Payable', value: totalPayable, icon: CreditCard, color: 'text-destructive', onClick: () => navigate('/outstanding') },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, icon: Icon, color, onClick }) => (
        <Card key={label} className={onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} onClick={onClick}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg bg-muted p-2.5 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tracking-tight">{formatCurrency(value)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

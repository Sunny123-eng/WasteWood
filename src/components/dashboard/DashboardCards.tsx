import { Card, CardContent } from '@/components/ui/card';
import { useBalances } from '@/hooks/useBalances';
import { useStore } from '@/hooks/useStore';
import { useDataStore } from '@/hooks/useDataStore';
import { formatCurrency, todayString } from '@/lib/format';
import type { Purchase, Sale, Expense, PaymentReceived, PaymentMade } from '@/types';
import {
  Wallet, Landmark, ShoppingCart, TrendingUp, Receipt, CreditCard,
  IndianRupee, UserCircle2, Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardCards() {
  const { balances } = useBalances();
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const { settings } = useDataStore();
  const navigate = useNavigate();

  const today = todayString();
  const todayPurchases = purchases.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
  const todaySales = sales.filter(s => s.date === today).reduce((a, s) => a + s.amount, 0);
  const todayExpenses = expenses.filter(e => e.date === today).reduce((a, e) => a + e.amount, 0);

  const totalSales = sales.reduce((a, s) => a + s.amount, 0);
  const totalPurchases = purchases.reduce((a, p) => a + p.amount, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const sunnyShare = netProfit * settings.sunnyPercent / 100;
  const partnerShare = netProfit * settings.partnerPercent / 100;

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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );

  type CardItem = {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    onClick?: () => void;
  };

  const renderCard = ({ label, value, icon: Icon, color, onClick }: CardItem) => (
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
  );

  return (
    <div className="space-y-5">
      <Section title="Balances">
        {renderCard({ label: 'Cash Balance', value: balances.cash, icon: Wallet, color: 'text-primary' })}
        {renderCard({ label: 'Bank Balance', value: balances.bank, icon: Landmark, color: 'text-accent' })}
      </Section>

      <Section title="Today">
        {renderCard({ label: "Today's Sales", value: todaySales, icon: TrendingUp, color: 'text-success' })}
        {renderCard({ label: "Today's Purchases", value: todayPurchases, icon: ShoppingCart, color: 'text-destructive' })}
        {renderCard({ label: "Today's Expenses", value: todayExpenses, icon: Receipt, color: 'text-warning' })}
      </Section>

      <Section title="Totals">
        {renderCard({ label: 'Total Sales', value: totalSales, icon: TrendingUp, color: 'text-success' })}
        {renderCard({ label: 'Total Purchases', value: totalPurchases, icon: ShoppingCart, color: 'text-destructive' })}
        {renderCard({ label: 'Total Expenses', value: totalExpenses, icon: Receipt, color: 'text-warning' })}
        {renderCard({
          label: 'Net Profit',
          value: netProfit,
          icon: IndianRupee,
          color: netProfit >= 0 ? 'text-success' : 'text-destructive',
          onClick: () => navigate('/profit'),
        })}
      </Section>

      <Section title="Partner Shares">
        {renderCard({ label: 'Sunny Share', value: sunnyShare, icon: UserCircle2, color: 'text-primary', onClick: () => navigate('/profit') })}
        {renderCard({ label: 'Partner Share', value: partnerShare, icon: Users, color: 'text-accent', onClick: () => navigate('/profit') })}
      </Section>

      <Section title="Outstanding">
        {renderCard({ label: 'Receivable', value: totalReceivable, icon: CreditCard, color: 'text-success', onClick: () => navigate('/outstanding') })}
        {renderCard({ label: 'Payable', value: totalPayable, icon: CreditCard, color: 'text-destructive', onClick: () => navigate('/outstanding') })}
      </Section>
    </div>
  );
}

import { useStore } from '@/hooks/useStore';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase, Sale, Expense, PaymentReceived, PaymentMade } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

function PurchaseRow({ p }: { p: Purchase }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{p.sawmillName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(p.date)} · {p.vehicleNumber}</p>
          <p className="text-xs text-muted-foreground">{p.quantity} KG × ₹{p.rate}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(p.amount)}</p>
          <Badge variant={p.paymentMode === 'credit' ? 'destructive' : 'secondary'} className="text-[10px]">{p.paymentMode}</Badge>
        </div>
      </div>
    </CardContent></Card>
  );
}

function SaleRow({ s }: { s: Sale }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{s.partyName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(s.date)} · Bill #{s.billNumber}</p>
          <p className="text-xs text-muted-foreground">{s.quantity} KG × ₹{s.rate}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-success">{formatCurrency(s.amount)}</p>
          <Badge variant={s.paymentMode === 'credit' ? 'destructive' : 'secondary'} className="text-[10px]">{s.paymentMode}</Badge>
        </div>
      </div>
    </CardContent></Card>
  );
}

function ExpenseRow({ e }: { e: Expense }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{e.description}</p>
          <p className="text-xs text-muted-foreground">{formatDate(e.date)} · Paid by {e.paidBy}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-destructive">{formatCurrency(e.amount)}</p>
          <Badge variant="secondary" className="text-[10px]">{e.paymentMode}</Badge>
        </div>
      </div>
    </CardContent></Card>
  );
}

function PaymentReceivedRow({ p }: { p: PaymentReceived }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{p.partyName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(p.date)} · Payment Received</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-success">{formatCurrency(p.amount)}</p>
          <Badge variant="secondary" className="text-[10px]">{p.paymentMode}</Badge>
        </div>
      </div>
    </CardContent></Card>
  );
}

function PaymentMadeRow({ p }: { p: PaymentMade }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{p.sawmillName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(p.date)} · Payment Made</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-destructive">{formatCurrency(p.amount)}</p>
          <Badge variant="secondary" className="text-[10px]">{p.paymentMode}</Badge>
        </div>
      </div>
    </CardContent></Card>
  );
}

export default function History() {
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Transaction History</h1>
      <Tabs defaultValue="purchases">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="purchases" className="flex-1 text-xs">Purchases</TabsTrigger>
          <TabsTrigger value="sales" className="flex-1 text-xs">Sales</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="received" className="flex-1 text-xs">Received</TabsTrigger>
          <TabsTrigger value="paid" className="flex-1 text-xs">Paid</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-3 space-y-2">
          {purchases.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No purchases yet</p> : [...purchases].reverse().map(p => <PurchaseRow key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="sales" className="mt-3 space-y-2">
          {sales.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No sales yet</p> : [...sales].reverse().map(s => <SaleRow key={s.id} s={s} />)}
        </TabsContent>
        <TabsContent value="expenses" className="mt-3 space-y-2">
          {expenses.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No expenses yet</p> : [...expenses].reverse().map(e => <ExpenseRow key={e.id} e={e} />)}
        </TabsContent>
        <TabsContent value="received" className="mt-3 space-y-2">
          {paymentsReceived.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No payments received</p> : [...paymentsReceived].reverse().map(p => <PaymentReceivedRow key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="paid" className="mt-3 space-y-2">
          {paymentsMade.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No payments made</p> : [...paymentsMade].reverse().map(p => <PaymentMadeRow key={p.id} p={p} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

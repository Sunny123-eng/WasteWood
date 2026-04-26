import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase, Sale, Expense, PaymentReceived, PaymentMade, Withdrawal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import EditTransactionDialog from '@/components/history/EditTransactionDialog';

type AnyTxn = Purchase | Sale | Expense | PaymentReceived | PaymentMade | Withdrawal;
type StoreKey = 'ww_purchases' | 'ww_sales' | 'ww_expenses' | 'ww_payments_received' | 'ww_payments_made' | 'ww_withdrawals';

interface AdminActionsProps<T extends AnyTxn> {
  item: T;
  storeKey: StoreKey;
  /** Reverse the cash/bank effect of the original transaction. */
  onReverseBalance: (item: T) => void;
}

function AdminActions<T extends AnyTxn>({ item, storeKey, onReverseBalance }: AdminActionsProps<T>) {
  const { isAdmin } = useAuth();
  const { update, remove } = useStore<T>(storeKey);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(item.date);
  const [amount, setAmount] = useState(String((item as { amount: number }).amount));

  if (!isAdmin) return null;

  async function handleDelete() {
    onReverseBalance(item);
    const ok = await remove(item.id);
    if (ok) toast.success('Deleted & balance reversed');
  }

  async function handleSave() {
    const newAmt = Number(amount);
    if (!newAmt || newAmt <= 0) { toast.error('Invalid amount'); return; }
    const oldAmt = (item as { amount: number }).amount;
    const diff = newAmt - oldAmt;
    if (diff !== 0) {
      // Adjust balance for the difference, in same direction as original txn.
      onReverseBalance({ ...item, amount: -diff } as T);
    }
    const ok = await update(item.id, { date, amount: newAmt } as Partial<T>);
    if (ok) { toast.success('Updated'); setEditing(false); }
  }

  return (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The cash/bank balance change from this transaction will be reversed automatically.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
          onClick={(e) => { e.stopPropagation(); (e.currentTarget.previousElementSibling as HTMLElement | null)?.click?.(); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Balance will adjust automatically if the amount changes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// AlertDialog needs an explicit trigger — wrap simpler:
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The cash/bank balance from this transaction will be reversed automatically. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onConfirm(); setOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface RowProps<T extends AnyTxn> {
  item: T;
  storeKey: StoreKey;
  onReverseBalance: (item: T) => void;
  children: React.ReactNode;
}

function RowShell<T extends AnyTxn>({ item, storeKey, onReverseBalance, children }: RowProps<T>) {
  const { isAdmin } = useAuth();
  const { update, remove } = useStore<T>(storeKey);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(item.date);
  const [amount, setAmount] = useState(String((item as { amount: number }).amount));

  async function handleDelete() {
    onReverseBalance(item);
    const ok = await remove(item.id);
    if (ok) toast.success('Deleted');
  }

  async function handleSave() {
    const newAmt = Number(amount);
    if (!newAmt || newAmt <= 0) { toast.error('Invalid amount'); return; }
    const oldAmt = (item as { amount: number }).amount;
    const diff = newAmt - oldAmt;
    if (diff !== 0) {
      onReverseBalance({ ...item, amount: -diff } as T);
    }
    const ok = await update(item.id, { date, amount: newAmt } as Partial<T>);
    if (ok) { toast.success('Updated'); setEditing(false); }
  }

  return (
    <Card>
      <CardContent className="p-3">
        {children}
        {isAdmin && (
          <div className="mt-2 flex justify-end gap-1 border-t pt-2">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
              setDate(item.date);
              setAmount(String((item as { amount: number }).amount));
              setEditing(true);
            }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <DeleteButton onConfirm={handleDelete} />
          </div>
        )}
      </CardContent>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Balance adjusts automatically if the amount changes.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function History() {
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const { items: withdrawals } = useStore<Withdrawal>('ww_withdrawals');
  const { updateBalance } = useBalances();

  // Reversal helpers — undo the cash/bank delta the original write applied.
  const reversePurchase = (p: Purchase) => {
    if (p.paymentMode !== 'credit') updateBalance(p.paymentMode, p.amount); // we subtracted, now add back
  };
  const reverseSale = (s: Sale) => {
    if (s.paymentMode !== 'credit') updateBalance(s.paymentMode, -s.amount); // we added, now subtract
  };
  const reverseExpense = (e: Expense) => {
    updateBalance(e.paymentMode, e.amount); // expense subtracted, add back
  };
  const reversePaymentReceived = (p: PaymentReceived) => {
    updateBalance(p.paymentMode, -p.amount);
  };
  const reversePaymentMade = (p: PaymentMade) => {
    updateBalance(p.paymentMode, p.amount);
  };
  const reverseWithdrawal = (w: Withdrawal) => {
    updateBalance(w.source, w.amount);
  };

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
          <TabsTrigger value="withdrawals" className="flex-1 text-xs">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-3 space-y-2">
          {purchases.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No purchases yet</p> :
            [...purchases].reverse().map(p => (
              <RowShell key={p.id} item={p} storeKey="ww_purchases" onReverseBalance={reversePurchase}>
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
              </RowShell>
            ))}
        </TabsContent>

        <TabsContent value="sales" className="mt-3 space-y-2">
          {sales.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No sales yet</p> :
            [...sales].reverse().map(s => (
              <RowShell key={s.id} item={s} storeKey="ww_sales" onReverseBalance={reverseSale}>
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
              </RowShell>
            ))}
        </TabsContent>

        <TabsContent value="expenses" className="mt-3 space-y-2">
          {expenses.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No expenses yet</p> :
            [...expenses].reverse().map(e => (
              <RowShell key={e.id} item={e} storeKey="ww_expenses" onReverseBalance={reverseExpense}>
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
              </RowShell>
            ))}
        </TabsContent>

        <TabsContent value="received" className="mt-3 space-y-2">
          {paymentsReceived.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No payments received</p> :
            [...paymentsReceived].reverse().map(p => (
              <RowShell key={p.id} item={p} storeKey="ww_payments_received" onReverseBalance={reversePaymentReceived}>
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
              </RowShell>
            ))}
        </TabsContent>

        <TabsContent value="paid" className="mt-3 space-y-2">
          {paymentsMade.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No payments made</p> :
            [...paymentsMade].reverse().map(p => (
              <RowShell key={p.id} item={p} storeKey="ww_payments_made" onReverseBalance={reversePaymentMade}>
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
              </RowShell>
            ))}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-3 space-y-2">
          {withdrawals.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No withdrawals yet</p> :
            [...withdrawals].reverse().map(w => (
              <RowShell key={w.id} item={w} storeKey="ww_withdrawals" onReverseBalance={reverseWithdrawal}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium capitalize">{w.person}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(w.date)} · {w.source}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{formatCurrency(w.amount)}</p>
                  </div>
                </div>
              </RowShell>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

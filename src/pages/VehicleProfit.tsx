import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/format';
import type { Purchase, Sale, Expense } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Truck, TrendingUp, ShoppingCart, Receipt, IndianRupee, Search } from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

interface VehicleSummary {
  vehicle: string;
  firstDate: string;
  lastDate: string;
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  purchaseQty: number;
  purchaseAmt: number;
  saleQty: number;
  saleAmt: number;
  expenseAmt: number;
  profit: number;
}

export default function VehicleProfit() {
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
  const [search, setSearch] = useState('');

  const summaries = useMemo<VehicleSummary[]>(() => {
    const map = new Map<string, VehicleSummary>();

    const ensure = (vehRaw: string | undefined, date: string): VehicleSummary | null => {
      const veh = (vehRaw || '').trim().toUpperCase();
      if (!veh) return null;
      let s = map.get(veh);
      if (!s) {
        s = {
          vehicle: veh,
          firstDate: date,
          lastDate: date,
          purchases: [], sales: [], expenses: [],
          purchaseQty: 0, purchaseAmt: 0,
          saleQty: 0, saleAmt: 0,
          expenseAmt: 0, profit: 0,
        };
        map.set(veh, s);
      }
      if (date < s.firstDate) s.firstDate = date;
      if (date > s.lastDate) s.lastDate = date;
      return s;
    };

    purchases.forEach(p => {
      const s = ensure(p.vehicleNumber, p.date);
      if (!s) return;
      s.purchases.push(p);
      s.purchaseQty += p.quantity;
      s.purchaseAmt += p.amount;
    });
    sales.forEach(sa => {
      const s = ensure(sa.vehicleNumber, sa.date);
      if (!s) return;
      s.sales.push(sa);
      s.saleQty += sa.quantity;
      s.saleAmt += sa.amount;
    });
    expenses.forEach(e => {
      const s = ensure(e.linkedVehicle, e.date);
      if (!s) return;
      s.expenses.push(e);
      s.expenseAmt += e.amount;
    });

    map.forEach(s => {
      s.profit = s.saleAmt - s.purchaseAmt - s.expenseAmt;
    });

    return Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [purchases, sales, expenses]);

  const filtered = summaries.filter(s =>
    !search.trim() || s.vehicle.includes(search.trim().toUpperCase())
  );

  const totals = filtered.reduce(
    (acc, s) => ({
      purchaseAmt: acc.purchaseAmt + s.purchaseAmt,
      saleAmt: acc.saleAmt + s.saleAmt,
      expenseAmt: acc.expenseAmt + s.expenseAmt,
      profit: acc.profit + s.profit,
    }),
    { purchaseAmt: 0, saleAmt: 0, expenseAmt: 0, profit: 0 }
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Vehicle-wise Profit</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Har gadi ka purchase, sale, kharcha aur profit</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vehicle number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 uppercase"
        />
      </div>

      {/* Totals strip */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Total Sales" value={totals.saleAmt} color="text-success" />
          <Stat label="Total Purchases" value={totals.purchaseAmt} color="text-destructive" />
          <Stat label="Total Expenses" value={totals.expenseAmt} color="text-warning" />
          <Stat label="Net Profit" value={totals.profit} color={totals.profit >= 0 ? 'text-success' : 'text-destructive'} bold />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No vehicle entries found.</CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map(s => (
            <AccordionItem key={s.vehicle} value={s.vehicle} className="border rounded-lg bg-card px-3">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex-1 flex items-center gap-3 text-left">
                  <div className="rounded-lg bg-muted p-2 text-primary">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{s.vehicle}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.firstDate === s.lastDate ? s.firstDate : `${s.firstDate} → ${s.lastDate}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${s.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(s.profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">profit</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                {/* Summary numbers */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat icon={ShoppingCart} label="Purchase" amt={s.purchaseAmt} qty={s.purchaseQty} color="text-destructive" />
                  <MiniStat icon={TrendingUp} label="Sale" amt={s.saleAmt} qty={s.saleQty} color="text-success" />
                  <MiniStat icon={Receipt} label="Expense" amt={s.expenseAmt} color="text-warning" />
                </div>

                {/* Purchase details */}
                {s.purchases.length > 0 && (
                  <Section title="Purchases (Sawmill se liya)">
                    {s.purchases.map(p => (
                      <Row
                        key={p.id}
                        date={p.date}
                        title={p.sawmillName}
                        sub={`${p.quantity} kg × ₹${p.rate}`}
                        amt={-p.amount}
                      />
                    ))}
                  </Section>
                )}

                {/* Sale details */}
                {s.sales.length > 0 && (
                  <Section title="Sales (Party ko becha)">
                    {s.sales.map(sa => (
                      <Row
                        key={sa.id}
                        date={sa.date}
                        title={sa.partyName}
                        sub={`${sa.quantity} kg × ₹${sa.rate}${sa.billNumber ? ` · Bill ${sa.billNumber}` : ''}`}
                        amt={sa.amount}
                      />
                    ))}
                  </Section>
                )}

                {/* Expense details */}
                {s.expenses.length > 0 && (
                  <Section title="Expenses (Mazdoor / Bill / etc.)">
                    {s.expenses.map(e => (
                      <Row
                        key={e.id}
                        date={e.date}
                        title={e.description}
                        sub={`Paid by ${e.paidBy} · ${e.paymentMode}`}
                        amt={-e.amount}
                      />
                    ))}
                  </Section>
                )}

                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Net Profit</span>
                  </div>
                  <span className={`text-base font-bold ${s.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(s.profit)}
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function Stat({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`${bold ? 'font-bold text-sm' : 'font-semibold text-sm'} ${color || ''}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, amt, qty, color,
}: { icon: React.ComponentType<{ className?: string }>; label: string; amt: number; qty?: number; color: string }) {
  return (
    <div className="rounded-md border p-2">
      <Icon className={`h-3.5 w-3.5 mx-auto ${color}`} />
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs font-semibold">{formatCurrency(amt)}</p>
      {qty !== undefined && qty > 0 && (
        <p className="text-[10px] text-muted-foreground">{qty} kg</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="rounded-md border divide-y">{children}</div>
    </div>
  );
}

function Row({ date, title, sub, amt }: { date: string; title: string; sub?: string; amt: number }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground">{date}{sub ? ` · ${sub}` : ''}</p>
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ${amt >= 0 ? 'text-success' : 'text-destructive'}`}>
        {formatCurrency(amt)}
      </span>
    </div>
  );
}

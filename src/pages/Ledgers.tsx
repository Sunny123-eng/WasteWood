import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/format';
import type { Purchase, Sale, PaymentReceived, PaymentMade, Party, Sawmill } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ChevronRight, Building2, Users } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  totalQty: number;
  totalAmount: number;
  paid: number;
  outstanding: number;
  lastDate: string;
  txnCount: number;
}

export default function Ledgers() {
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const { items: parties } = useStore<Party>('ww_parties');
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const partyRows = useMemo<Row[]>(() => {
    return parties.map(p => {
      const ps = sales.filter(s => s.partyId === p.id);
      const credit = ps.filter(s => s.paymentMode === 'credit').reduce((a, s) => a + s.amount, 0);
      const paid = paymentsReceived.filter(pr => pr.partyId === p.id).reduce((a, pr) => a + pr.amount, 0);
      const lastDate = [...ps.map(s => s.date), ...paymentsReceived.filter(pr => pr.partyId === p.id).map(pr => pr.date)]
        .sort().pop() || '';
      return {
        id: p.id,
        name: p.name,
        totalQty: ps.reduce((a, s) => a + s.quantity, 0),
        totalAmount: ps.reduce((a, s) => a + s.amount, 0),
        paid,
        outstanding: credit - paid,
        lastDate,
        txnCount: ps.length + paymentsReceived.filter(pr => pr.partyId === p.id).length,
      };
    }).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [parties, sales, paymentsReceived]);

  const sawmillRows = useMemo<Row[]>(() => {
    return sawmills.map(s => {
      const pu = purchases.filter(p => p.sawmillId === s.id);
      const credit = pu.filter(p => p.paymentMode === 'credit').reduce((a, p) => a + p.amount, 0);
      const paid = paymentsMade.filter(pm => pm.sawmillId === s.id).reduce((a, pm) => a + pm.amount, 0);
      const lastDate = [...pu.map(p => p.date), ...paymentsMade.filter(pm => pm.sawmillId === s.id).map(pm => pm.date)]
        .sort().pop() || '';
      return {
        id: s.id,
        name: s.name,
        totalQty: pu.reduce((a, p) => a + p.quantity, 0),
        totalAmount: pu.reduce((a, p) => a + p.amount, 0),
        paid,
        outstanding: credit - paid,
        lastDate,
        txnCount: pu.length + paymentsMade.filter(pm => pm.sawmillId === s.id).length,
      };
    }).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [sawmills, purchases, paymentsMade]);

  const filterRows = (rows: Row[]) =>
    rows.filter(r => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()));

  const renderRow = (r: Row, type: 'party' | 'sawmill') => (
    <Card
      key={r.id}
      className="cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(`/ledger/${type}/${r.id}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{r.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {r.txnCount} txn{r.txnCount !== 1 ? 's' : ''}
              {r.totalQty > 0 ? ` · ${r.totalQty.toLocaleString('en-IN')} kg` : ''}
              {r.lastDate ? ` · ${r.lastDate}` : ''}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total: <span className="font-medium text-foreground">{formatCurrency(r.totalAmount)}</span>
              {' · '}Paid: <span className="font-medium text-foreground">{formatCurrency(r.paid)}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            {r.outstanding > 0 ? (
              <p className={`text-sm font-bold ${type === 'party' ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(r.outstanding)}
              </p>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">Settled</p>
            )}
            <p className="text-[10px] text-muted-foreground">{type === 'party' ? 'to receive' : 'to pay'}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );

  const filteredParties = filterRows(partyRows);
  const filteredSawmills = filterRows(sawmillRows);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Ledgers</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sawmills aur Parties ka complete history — kab kitna mal liya/becha aur kab paise diye/liye
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="sawmills">
        <TabsList className="w-full">
          <TabsTrigger value="sawmills" className="flex-1 gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Sawmills ({filteredSawmills.length})
          </TabsTrigger>
          <TabsTrigger value="parties" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" /> Parties ({filteredParties.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sawmills" className="mt-3 space-y-2">
          {filteredSawmills.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No sawmills found</p>
          ) : filteredSawmills.map(r => renderRow(r, 'sawmill'))}
        </TabsContent>

        <TabsContent value="parties" className="mt-3 space-y-2">
          {filteredParties.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No parties found</p>
          ) : filteredParties.map(r => renderRow(r, 'party'))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

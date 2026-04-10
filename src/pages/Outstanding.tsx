import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/format';
import type { Purchase, Sale, PaymentReceived, PaymentMade, Party, Sawmill } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function Outstanding() {
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { items: paymentsReceived } = useStore<PaymentReceived>('ww_payments_received');
  const { items: paymentsMade } = useStore<PaymentMade>('ww_payments_made');
  const { items: parties } = useStore<Party>('ww_parties');
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');
  const navigate = useNavigate();

  const receivables = useMemo(() => {
    const map = new Map<string, { name: string; total: number; paid: number }>();
    sales.filter(s => s.paymentMode === 'credit').forEach(s => {
      const entry = map.get(s.partyId) || { name: s.partyName, total: 0, paid: 0 };
      entry.total += s.amount;
      map.set(s.partyId, entry);
    });
    paymentsReceived.forEach(p => {
      const entry = map.get(p.partyId);
      if (entry) entry.paid += p.amount;
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, outstanding: v.total - v.paid }))
      .filter(r => r.outstanding > 0);
  }, [sales, paymentsReceived]);

  const payables = useMemo(() => {
    const map = new Map<string, { name: string; total: number; paid: number }>();
    purchases.filter(p => p.paymentMode === 'credit').forEach(p => {
      const entry = map.get(p.sawmillId) || { name: p.sawmillName, total: 0, paid: 0 };
      entry.total += p.amount;
      map.set(p.sawmillId, entry);
    });
    paymentsMade.forEach(p => {
      const entry = map.get(p.sawmillId);
      if (entry) entry.paid += p.amount;
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, outstanding: v.total - v.paid }))
      .filter(r => r.outstanding > 0);
  }, [purchases, paymentsMade]);

  const totalReceivable = receivables.reduce((a, r) => a + r.outstanding, 0);
  const totalPayable = payables.reduce((a, p) => a + p.outstanding, 0);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Outstanding</h1>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Receivable</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totalReceivable)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Payable</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(totalPayable)}</p>
        </CardContent></Card>
      </div>
      <Tabs defaultValue="receivable">
        <TabsList className="w-full">
          <TabsTrigger value="receivable" className="flex-1">Receivable ({receivables.length})</TabsTrigger>
          <TabsTrigger value="payable" className="flex-1">Payable ({payables.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="receivable" className="mt-3 space-y-2">
          {receivables.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No outstanding receivables</p>
          ) : receivables.map(r => (
            <Card key={r.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/ledger/party/${r.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <p className="font-medium">{r.name}</p>
                <p className="font-bold text-success">{formatCurrency(r.outstanding)}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="payable" className="mt-3 space-y-2">
          {payables.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No outstanding payables</p>
          ) : payables.map(p => (
            <Card key={p.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/ledger/sawmill/${p.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <p className="font-medium">{p.name}</p>
                <p className="font-bold text-destructive">{formatCurrency(p.outstanding)}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

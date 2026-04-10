import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { todayString } from '@/lib/format';
import type { Party, PaymentReceived, Sale } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useMemo } from 'react';

const schema = z.object({
  date: z.string().min(1),
  partyId: z.string().min(1, 'Select a party'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMode: z.enum(['cash', 'bank']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PaymentReceivedForm() {
  const { items: parties } = useStore<Party>('ww_parties');
  const { add } = useStore<PaymentReceived>('ww_payments_received');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { updateBalance } = useBalances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayString(), partyId: '', amount: 0, paymentMode: 'cash', notes: '' },
  });

  const selectedPartyId = form.watch('partyId');

  const outstanding = useMemo(() => {
    if (!selectedPartyId) return 0;
    const { items: payments } = { items: JSON.parse(localStorage.getItem('ww_payments_received') || '[]') as PaymentReceived[] };
    const creditSales = sales.filter(s => s.partyId === selectedPartyId && s.paymentMode === 'credit').reduce((a, s) => a + s.amount, 0);
    const received = payments.filter(p => p.partyId === selectedPartyId).reduce((a, p) => a + p.amount, 0);
    return creditSales - received;
  }, [selectedPartyId, sales]);

  function onSubmit(values: FormValues) {
    const party = parties.find(p => p.id === values.partyId);
    if (!party) return;
    add({ ...values, partyName: party.name } as Omit<PaymentReceived, 'id' | 'createdAt'>);
    updateBalance(values.paymentMode, values.amount);
    toast.success(`Payment of ${formatCurrency(values.amount)} received from ${party.name}`);
    form.reset({ date: todayString(), partyId: '', amount: 0, paymentMode: 'cash', notes: '' });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="partyId" render={({ field }) => (
          <FormItem><FormLabel>Party</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger></FormControl>
              <SelectContent>{parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedPartyId && outstanding > 0 && (
              <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(outstanding)}</p>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" inputMode="numeric" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="paymentMode" render={({ field }) => (
          <FormItem><FormLabel>Payment Mode</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full">Record Payment Received</Button>
      </form>
    </Form>
  );
}

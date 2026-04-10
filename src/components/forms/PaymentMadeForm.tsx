import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { todayString } from '@/lib/format';
import type { Sawmill, PaymentMade, Purchase } from '@/types';
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
  sawmillId: z.string().min(1, 'Select a sawmill'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMode: z.enum(['cash', 'bank']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PaymentMadeForm() {
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');
  const { add } = useStore<PaymentMade>('ww_payments_made');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { updateBalance } = useBalances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayString(), sawmillId: '', amount: 0, paymentMode: 'cash', notes: '' },
  });

  const selectedSawmillId = form.watch('sawmillId');

  const outstanding = useMemo(() => {
    if (!selectedSawmillId) return 0;
    const payments: PaymentMade[] = JSON.parse(localStorage.getItem('ww_payments_made') || '[]');
    const creditPurchases = purchases.filter(p => p.sawmillId === selectedSawmillId && p.paymentMode === 'credit').reduce((a, p) => a + p.amount, 0);
    const paid = payments.filter(p => p.sawmillId === selectedSawmillId).reduce((a, p) => a + p.amount, 0);
    return creditPurchases - paid;
  }, [selectedSawmillId, purchases]);

  function onSubmit(values: FormValues) {
    const sawmill = sawmills.find(s => s.id === values.sawmillId);
    if (!sawmill) return;
    add({ ...values, sawmillName: sawmill.name } as Omit<PaymentMade, 'id' | 'createdAt'>);
    updateBalance(values.paymentMode, -values.amount);
    toast.success(`Payment of ${formatCurrency(values.amount)} made to ${sawmill.name}`);
    form.reset({ date: todayString(), sawmillId: '', amount: 0, paymentMode: 'cash', notes: '' });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="sawmillId" render={({ field }) => (
          <FormItem><FormLabel>Sawmill</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select sawmill" /></SelectTrigger></FormControl>
              <SelectContent>{sawmills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSawmillId && outstanding > 0 && (
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
        <Button type="submit" className="w-full">Record Payment Made</Button>
      </form>
    </Form>
  );
}

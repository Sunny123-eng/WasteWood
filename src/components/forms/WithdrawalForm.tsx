import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { todayString, formatCurrency } from '@/lib/format';
import type { Withdrawal } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const schema = z.object({
  date: z.string().min(1),
  person: z.enum(['sunny', 'partner']),
  amount: z.coerce.number().positive('Amount must be positive'),
  source: z.enum(['cash', 'bank']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function WithdrawalForm() {
  const { add } = useStore<Withdrawal>('ww_withdrawals');
  const { updateBalance } = useBalances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayString(), person: 'sunny', amount: 0, source: 'cash', notes: '' },
  });

  function onSubmit(values: FormValues) {
    add(values as Omit<Withdrawal, 'id' | 'createdAt'>);
    updateBalance(values.source, -values.amount);
    toast.success(`${formatCurrency(values.amount)} withdrawn by ${values.person === 'sunny' ? 'Sunny' : 'Partner'}`);
    form.reset({ date: todayString(), person: 'sunny', amount: 0, source: 'cash', notes: '' });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="person" render={({ field }) => (
          <FormItem><FormLabel>Person</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="sunny">Sunny</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" inputMode="numeric" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="source" render={({ field }) => (
          <FormItem><FormLabel>Source</FormLabel>
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
        <Button type="submit" className="w-full">Record Withdrawal</Button>
      </form>
    </Form>
  );
}

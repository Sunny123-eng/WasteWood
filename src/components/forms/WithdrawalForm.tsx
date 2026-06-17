import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { todayString, formatCurrency } from '@/lib/format';
import type { Withdrawal, Partner } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useEffect } from 'react';

const schema = z.object({
  date: z.string().min(1),
  /** Partner UUID */
  person: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  source: z.enum(['cash', 'bank']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function WithdrawalForm() {
  const { add } = useStore<Withdrawal>('ww_withdrawals');
  const { items: partners } = useStore<Partner>('ww_partners');
  const { updateBalance } = useBalances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayString(), person: '', amount: 0, source: 'cash', notes: '' },
  });

  // Default to first partner once list loads.
  useEffect(() => {
    if (!form.getValues('person') && partners.length > 0) {
      form.setValue('person', partners[0].id);
    }
  }, [partners, form]);

  function onSubmit(values: FormValues) {
    if (partners.length === 0) {
      toast.error('Add a partner first');
      return;
    }
    add(values as Omit<Withdrawal, 'id' | 'createdAt'>);
    updateBalance(values.source, -values.amount);
    const partner = partners.find(p => p.id === values.person);
    toast.success(`${formatCurrency(values.amount)} withdrawn by ${partner?.partnerName ?? 'Partner'}`);
    form.reset({ date: todayString(), person: values.person, amount: 0, source: 'cash', notes: '' });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="person" render={({ field }) => (
          <FormItem><FormLabel>Partner</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger></FormControl>
              <SelectContent>
                {partners.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.partnerName}</SelectItem>
                ))}
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
        <Button type="submit" className="w-full" disabled={partners.length === 0}>Record Withdrawal</Button>
      </form>
    </Form>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import { todayString } from '@/lib/format';
import type { Expense, Sale, Purchase } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

const schema = z.object({
  date: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be > 0'),
  paidBy: z.enum(['business', 'sunny', 'partner']),
  paymentMode: z.enum(['cash', 'bank']),
  linkedVehicle: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ExpenseForm() {
  const { items: expenses, add } = useStore<Expense>('ww_expenses');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
  const { updateBalance } = useBalances();
  const navigate = useNavigate();

  const vehicleSuggestions = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => s.vehicleNumber && set.add(s.vehicleNumber));
    purchases.forEach(p => p.vehicleNumber && set.add(p.vehicleNumber));
    expenses.forEach(e => e.linkedVehicle && set.add(e.linkedVehicle));
    return Array.from(set);
  }, [sales, purchases, expenses]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayString(), description: '', amount: 0, paidBy: 'business', paymentMode: 'cash', linkedVehicle: '' },
  });

  function onSubmit(data: FormData) {
    add({
      date: data.date,
      description: data.description,
      amount: data.amount,
      paidBy: data.paidBy,
      paymentMode: data.paymentMode,
      linkedVehicle: data.linkedVehicle,
    });
    if (data.paidBy === 'business') {
      updateBalance(data.paymentMode, -data.amount);
    }
    toast.success('Expense saved!');
    navigate('/');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g. Diesel, Labour" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="paidBy" render={({ field }) => (
            <FormItem><FormLabel>Paid By</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="sunny">Sunny</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
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
        </div>

        <FormField control={form.control} name="linkedVehicle" render={({ field }) => (
          <FormItem>
            <FormLabel>Linked Vehicle (Optional)</FormLabel>
            <FormControl>
              <Input list="vehicle-suggestions" placeholder="Vehicle number" {...field} />
            </FormControl>
            <datalist id="vehicle-suggestions">
              {vehicleSuggestions.map(v => <option key={v} value={v} />)}
            </datalist>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" size="lg">Save Expense</Button>
      </form>
    </Form>
  );
}

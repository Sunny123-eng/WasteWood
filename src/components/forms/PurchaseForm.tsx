import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { todayString } from '@/lib/format';
import type { Sawmill, Purchase, Sale, Expense } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  date: z.string().min(1, 'Required'),
  sawmillId: z.string().min(1, 'Select sawmill'),
  rate: z.coerce.number().positive('Must be > 0'),
  quantity: z.coerce.number().positive('Must be > 0'),
  vehicleNumber: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PurchaseForm() {
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');
  const { items: purchases, add } = useStore<Purchase>('ww_purchases');
  const { items: sales } = useStore<Sale>('ww_sales');
  const { items: expenses } = useStore<Expense>('ww_expenses');
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
    defaultValues: { date: todayString(), sawmillId: '', rate: 0, quantity: 0, vehicleNumber: '', notes: '' },
  });

  const selectedSawmillId = form.watch('sawmillId');
  const rate = form.watch('rate');
  const quantity = form.watch('quantity');
  const amount = (rate || 0) * (quantity || 0);

  useEffect(() => {
    const sawmill = sawmills.find(s => s.id === selectedSawmillId);
    if (sawmill) form.setValue('rate', sawmill.defaultRate);
  }, [selectedSawmillId, sawmills, form]);

  function onSubmit(data: FormData) {
    const sawmill = sawmills.find(s => s.id === data.sawmillId);
    add({
      date: data.date,
      sawmillId: data.sawmillId,
      sawmillName: sawmill?.name || '',
      rate: data.rate,
      quantity: data.quantity,
      amount,
      vehicleNumber: data.vehicleNumber,
      paymentMode: 'credit',
      notes: data.notes,
    });
    toast.success('Purchase saved as Credit (Udhaar)!');
    navigate('/');
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
            </Select><FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="rate" render={({ field }) => (
            <FormItem><FormLabel>Rate (₹/KG)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantity (KG)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold text-primary">₹{amount.toLocaleString('en-IN')}</p>
        </div>

        <FormField control={form.control} name="vehicleNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>Vehicle / Gadi Number</FormLabel>
            <FormControl>
              <Input list="vehicle-suggestions" placeholder="e.g. MH 12 AB 1234" {...field} />
            </FormControl>
            <datalist id="vehicle-suggestions">
              {vehicleSuggestions.map(v => <option key={v} value={v} />)}
            </datalist>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Optional notes..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          Entry Credit (Udhaar) ke roop mein save hogi. Sawmill ko payment karne par "Payment Made" se settle karein.
        </div>

        <Button type="submit" className="w-full" size="lg">Save Purchase</Button>
      </form>
    </Form>
  );
}

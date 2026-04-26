import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/hooks/useStore';
import { todayString } from '@/lib/format';
import type { Party, Sale, Purchase, Expense } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

const schema = z.object({
  date: z.string().min(1, 'Required'),
  partyId: z.string().min(1, 'Select party'),
  rate: z.coerce.number().positive('Must be > 0'),
  quantity: z.coerce.number().positive('Must be > 0'),
  vehicleNumber: z.string().min(1, 'Required'),
  billNumber: z.string().min(1, 'Bill number is mandatory'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SaleForm() {
  const { items: parties } = useStore<Party>('ww_parties');
  const { items: sales, add } = useStore<Sale>('ww_sales');
  const { items: purchases } = useStore<Purchase>('ww_purchases');
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
    defaultValues: { date: todayString(), partyId: '', rate: 0, quantity: 0, vehicleNumber: '', billNumber: '', notes: '' },
  });

  const rate = form.watch('rate');
  const quantity = form.watch('quantity');
  const amount = (rate || 0) * (quantity || 0);

  function onSubmit(data: FormData) {
    const party = parties.find(p => p.id === data.partyId);
    add({
      date: data.date,
      partyId: data.partyId,
      partyName: party?.name || '',
      rate: data.rate,
      quantity: data.quantity,
      amount,
      vehicleNumber: data.vehicleNumber,
      billNumber: data.billNumber,
      paymentMode: 'credit',
      notes: data.notes,
    });
    toast.success('Sale saved as Credit (Udhaar)!');
    navigate('/');
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
          <p className="text-2xl font-bold text-success">₹{amount.toLocaleString('en-IN')}</p>
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

        <FormField control={form.control} name="billNumber" render={({ field }) => (
          <FormItem><FormLabel>Bill Number</FormLabel><FormControl><Input placeholder="Bill #" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Optional notes..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          Entry Credit (Udhaar) ke roop mein save hogi. Payment milne par "Payment Received" se settle karein.
        </div>

        <Button type="submit" className="w-full" size="lg">Save Sale</Button>
      </form>
    </Form>
  );
}

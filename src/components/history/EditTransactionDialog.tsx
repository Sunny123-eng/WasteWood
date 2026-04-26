/**
 * Full edit dialog for any transaction in History. Edits all fields (not just
 * date/amount). Cash/bank balance is fully reversed for the OLD entry, then
 * re-applied based on the NEW values, so any change (mode, amount, etc.) stays
 * accurate.
 */
import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { useBalances } from '@/hooks/useBalances';
import type {
  Purchase, Sale, Expense, PaymentReceived, PaymentMade, Withdrawal,
  Sawmill, Party, PaymentMode, PaidBy,
} from '@/types';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export type AnyTxn =
  | Purchase | Sale | Expense | PaymentReceived | PaymentMade | Withdrawal;
export type StoreKey =
  | 'ww_purchases' | 'ww_sales' | 'ww_expenses'
  | 'ww_payments_received' | 'ww_payments_made' | 'ww_withdrawals';

interface Props<T extends AnyTxn> {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: T;
  storeKey: StoreKey;
}

export default function EditTransactionDialog<T extends AnyTxn>({
  open, onOpenChange, item, storeKey,
}: Props<T>) {
  const { update } = useStore<T>(storeKey);
  const { updateBalance } = useBalances();
  const { items: sawmills } = useStore<Sawmill>('ww_sawmills');
  const { items: parties } = useStore<Party>('ww_parties');

  // Local form state — initialised from the item.
  const [form, setForm] = useState<Record<string, unknown>>(() => ({ ...item }));

  // When item swaps (e.g. dialog re-opened on different row), reset state.
  useMemo(() => { setForm({ ...item }); }, [item]);

  function setField(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  /** Reverse the old item's effect on cash/bank, then apply new effect. */
  function adjustBalances(oldT: AnyTxn, newT: Record<string, unknown>) {
    switch (storeKey) {
      case 'ww_purchases': {
        const o = oldT as Purchase;
        if (o.paymentMode !== 'credit') updateBalance(o.paymentMode, o.amount);
        const mode = newT.paymentMode as PaymentMode;
        const amt = Number(newT.amount) || 0;
        if (mode !== 'credit') updateBalance(mode, -amt);
        break;
      }
      case 'ww_sales': {
        const o = oldT as Sale;
        if (o.paymentMode !== 'credit') updateBalance(o.paymentMode, -o.amount);
        const mode = newT.paymentMode as PaymentMode;
        const amt = Number(newT.amount) || 0;
        if (mode !== 'credit') updateBalance(mode, amt);
        break;
      }
      case 'ww_expenses': {
        const o = oldT as Expense;
        updateBalance(o.paymentMode, o.amount);
        const mode = newT.paymentMode as 'cash' | 'bank';
        updateBalance(mode, -(Number(newT.amount) || 0));
        break;
      }
      case 'ww_payments_received': {
        const o = oldT as PaymentReceived;
        updateBalance(o.paymentMode, -o.amount);
        updateBalance(newT.paymentMode as 'cash' | 'bank', Number(newT.amount) || 0);
        break;
      }
      case 'ww_payments_made': {
        const o = oldT as PaymentMade;
        updateBalance(o.paymentMode, o.amount);
        updateBalance(newT.paymentMode as 'cash' | 'bank', -(Number(newT.amount) || 0));
        break;
      }
      case 'ww_withdrawals': {
        const o = oldT as Withdrawal;
        updateBalance(o.source, o.amount);
        updateBalance(newT.source as 'cash' | 'bank', -(Number(newT.amount) || 0));
        break;
      }
    }
  }

  async function handleSave() {
    // Common validation
    if (!form.date) { toast.error('Date required'); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast.error('Amount must be greater than 0'); return; }

    // Per-type required-field check
    if (storeKey === 'ww_sales' && !String(form.billNumber || '').trim()) {
      toast.error('Bill number is required'); return;
    }

    // Recompute amount for purchases/sales from rate × qty if either changed
    const patch: Record<string, unknown> = { ...form };
    if (storeKey === 'ww_purchases' || storeKey === 'ww_sales') {
      const rate = Number(form.rate) || 0;
      const qty = Number(form.quantity) || 0;
      if (rate > 0 && qty > 0) patch.amount = rate * qty;
    }

    // Sync sawmill/party name if id changed
    if ((storeKey === 'ww_purchases' || storeKey === 'ww_payments_made') && form.sawmillId) {
      const s = sawmills.find(x => x.id === form.sawmillId);
      if (s) patch.sawmillName = s.name;
    }
    if ((storeKey === 'ww_sales' || storeKey === 'ww_payments_received') && form.partyId) {
      const p = parties.find(x => x.id === form.partyId);
      if (p) patch.partyName = p.name;
    }

    // Strip immutable fields from patch
    delete patch.id; delete patch.createdAt;

    adjustBalances(item, patch);
    const ok = await update(item.id, patch as Partial<T>);
    if (ok) {
      toast.success('Entry updated');
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={String(form.date ?? '')}
              onChange={e => setField('date', e.target.value)} />
          </div>

          {/* Purchases */}
          {storeKey === 'ww_purchases' && (
            <>
              <div>
                <Label className="text-xs">Sawmill</Label>
                <Select value={String(form.sawmillId ?? '')} onValueChange={v => setField('sawmillId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sawmills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Rate (₹/KG)</Label>
                  <Input type="number" inputMode="decimal" value={String(form.rate ?? '')}
                    onChange={e => setField('rate', Number(e.target.value))} /></div>
                <div><Label className="text-xs">Quantity (KG)</Label>
                  <Input type="number" inputMode="decimal" value={String(form.quantity ?? '')}
                    onChange={e => setField('quantity', Number(e.target.value))} /></div>
              </div>
              <div><Label className="text-xs">Amount (auto)</Label>
                <Input type="number" value={String(((Number(form.rate)||0) * (Number(form.quantity)||0)) || form.amount || 0)} readOnly /></div>
              <div><Label className="text-xs">Vehicle Number</Label>
                <Input value={String(form.vehicleNumber ?? '')} onChange={e => setField('vehicleNumber', e.target.value)} /></div>
              <PaymentModeField value={form.paymentMode as PaymentMode} onChange={v => setField('paymentMode', v)} includeCredit />
            </>
          )}

          {/* Sales */}
          {storeKey === 'ww_sales' && (
            <>
              <div>
                <Label className="text-xs">Party</Label>
                <Select value={String(form.partyId ?? '')} onValueChange={v => setField('partyId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Rate (₹/KG)</Label>
                  <Input type="number" inputMode="decimal" value={String(form.rate ?? '')}
                    onChange={e => setField('rate', Number(e.target.value))} /></div>
                <div><Label className="text-xs">Quantity (KG)</Label>
                  <Input type="number" inputMode="decimal" value={String(form.quantity ?? '')}
                    onChange={e => setField('quantity', Number(e.target.value))} /></div>
              </div>
              <div><Label className="text-xs">Amount (auto)</Label>
                <Input type="number" value={String(((Number(form.rate)||0) * (Number(form.quantity)||0)) || form.amount || 0)} readOnly /></div>
              <div><Label className="text-xs">Vehicle Number</Label>
                <Input value={String(form.vehicleNumber ?? '')} onChange={e => setField('vehicleNumber', e.target.value)} /></div>
              <div><Label className="text-xs">Bill Number *</Label>
                <Input value={String(form.billNumber ?? '')} onChange={e => setField('billNumber', e.target.value)} /></div>
              <PaymentModeField value={form.paymentMode as PaymentMode} onChange={v => setField('paymentMode', v)} includeCredit />
            </>
          )}

          {/* Expenses */}
          {storeKey === 'ww_expenses' && (
            <>
              <div><Label className="text-xs">Description</Label>
                <Input value={String(form.description ?? '')} onChange={e => setField('description', e.target.value)} /></div>
              <div><Label className="text-xs">Amount (₹)</Label>
                <Input type="number" inputMode="numeric" value={String(form.amount ?? '')}
                  onChange={e => setField('amount', Number(e.target.value))} /></div>
              <div>
                <Label className="text-xs">Paid By</Label>
                <Select value={String(form.paidBy ?? 'business')} onValueChange={v => setField('paidBy', v as PaidBy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="sunny">Sunny</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PaymentModeField value={form.paymentMode as PaymentMode} onChange={v => setField('paymentMode', v)} />
              <div><Label className="text-xs">Linked Vehicle (optional)</Label>
                <Input value={String(form.linkedVehicle ?? '')} onChange={e => setField('linkedVehicle', e.target.value)} /></div>
            </>
          )}

          {/* Payments Received */}
          {storeKey === 'ww_payments_received' && (
            <>
              <div>
                <Label className="text-xs">Party</Label>
                <Select value={String(form.partyId ?? '')} onValueChange={v => setField('partyId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Amount (₹)</Label>
                <Input type="number" inputMode="numeric" value={String(form.amount ?? '')}
                  onChange={e => setField('amount', Number(e.target.value))} /></div>
              <PaymentModeField value={form.paymentMode as PaymentMode} onChange={v => setField('paymentMode', v)} />
            </>
          )}

          {/* Payments Made */}
          {storeKey === 'ww_payments_made' && (
            <>
              <div>
                <Label className="text-xs">Sawmill</Label>
                <Select value={String(form.sawmillId ?? '')} onValueChange={v => setField('sawmillId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sawmills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Amount (₹)</Label>
                <Input type="number" inputMode="numeric" value={String(form.amount ?? '')}
                  onChange={e => setField('amount', Number(e.target.value))} /></div>
              <PaymentModeField value={form.paymentMode as PaymentMode} onChange={v => setField('paymentMode', v)} />
            </>
          )}

          {/* Withdrawals */}
          {storeKey === 'ww_withdrawals' && (
            <>
              <div>
                <Label className="text-xs">Person</Label>
                <Select value={String(form.person ?? 'sunny')} onValueChange={v => setField('person', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunny">Sunny</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Amount (₹)</Label>
                <Input type="number" inputMode="numeric" value={String(form.amount ?? '')}
                  onChange={e => setField('amount', Number(e.target.value))} /></div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={String(form.source ?? 'cash')} onValueChange={v => setField('source', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Notes (common where applicable) */}
          {('notes' in (item as object)) && (
            <div><Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={String(form.notes ?? '')} onChange={e => setField('notes', e.target.value)} /></div>
          )}

          <p className="text-xs text-muted-foreground">
            Cash/Bank balance auto-adjusts based on your changes.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentModeField({
  value, onChange, includeCredit = false,
}: { value: PaymentMode; onChange: (v: PaymentMode) => void; includeCredit?: boolean }) {
  return (
    <div>
      <Label className="text-xs">Payment Mode</Label>
      <Select value={value} onValueChange={v => onChange(v as PaymentMode)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="bank">Bank</SelectItem>
          {includeCredit && <SelectItem value="credit">Credit (Udhaar)</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

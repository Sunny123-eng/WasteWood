import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import type { Partner } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, Trash2, Crown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface FormState {
  partnerName: string;
  mobile: string;
  email: string;
  profitSharePercentage: string;
  investmentAmount: string;
  notes: string;
}

const empty: FormState = {
  partnerName: '', mobile: '', email: '',
  profitSharePercentage: '0', investmentAmount: '0', notes: '',
};

export default function PartnersManagement() {
  const { items: partners, add, update, remove } = useStore<Partner>('ww_partners');
  const { isBusinessAdmin } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalShare = useMemo(
    () => partners.reduce((a, p) => a + Number(p.profitSharePercentage || 0), 0),
    [partners],
  );
  const totalInvestment = useMemo(
    () => partners.reduce((a, p) => a + Number(p.investmentAmount || 0), 0),
    [partners],
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  }

  function openEdit(p: Partner) {
    setEditing(p);
    setForm({
      partnerName: p.partnerName,
      mobile: p.mobile ?? '',
      email: p.email ?? '',
      profitSharePercentage: String(p.profitSharePercentage),
      investmentAmount: String(p.investmentAmount),
      notes: p.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.partnerName.trim()) { toast.error('Name is required'); return; }
    const pct = Number(form.profitSharePercentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Profit % must be between 0 and 100'); return;
    }
    const inv = Number(form.investmentAmount);
    if (Number.isNaN(inv) || inv < 0) { toast.error('Investment must be ≥ 0'); return; }

    const projected = partners
      .filter(p => p.id !== editing?.id)
      .reduce((a, p) => a + Number(p.profitSharePercentage || 0), 0) + pct;
    if (projected > 100.0001) {
      toast.error(`Total share would be ${projected.toFixed(2)}% — cannot exceed 100%`);
      return;
    }

    const payload = {
      partnerName: form.partnerName.trim(),
      mobile: form.mobile.trim() || undefined,
      email: form.email.trim() || undefined,
      profitSharePercentage: pct,
      investmentAmount: inv,
      notes: form.notes.trim() || undefined,
    };

    const ok = editing
      ? await update(editing.id, payload as Partial<Partner>)
      : !!(await add(payload as Omit<Partner, 'id' | 'createdAt'>));
    if (ok) {
      toast.success(editing ? 'Partner updated' : 'Partner added');
      setDialogOpen(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const p = partners.find(x => x.id === deleteId);
    if (p?.isOwner && partners.length === 1) {
      toast.error('Cannot delete the only Owner partner');
      setDeleteId(null);
      return;
    }
    const ok = await remove(deleteId);
    if (ok) toast.success('Partner removed');
    setDeleteId(null);
  }

  const shareStatus = Math.abs(totalShare - 100) < 0.01
    ? { ok: true, msg: 'Total profit share equals 100%' }
    : { ok: false, msg: `Total profit share is ${totalShare.toFixed(2)}% — must equal 100%` };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Partners</h1>
        {isBusinessAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      <Card className={shareStatus.ok ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}>
        <CardContent className="p-3 flex items-start gap-2 text-sm">
          {shareStatus.ok
            ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
            : <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />}
          <div>
            <p className="font-medium">{shareStatus.msg}</p>
            <p className="text-xs text-muted-foreground">
              Total invested: {formatCurrency(totalInvestment)} · {partners.length} partner{partners.length === 1 ? '' : 's'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {partners.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No partners yet.</p>
        )}
        {partners.map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {p.isOwner && <Crown className="h-3.5 w-3.5 text-warning shrink-0" />}
                  <p className="font-semibold truncate">{p.partnerName}</p>
                  <span className="ml-auto text-sm font-bold text-primary shrink-0">
                    {Number(p.profitSharePercentage).toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Investment: {formatCurrency(Number(p.investmentAmount))}
                </p>
                {(p.mobile || p.email) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[p.mobile, p.email].filter(Boolean).join(' · ')}
                  </p>
                )}
                {p.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.notes}</p>
                )}
              </div>
              {isBusinessAdmin && (
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit partner' : 'Add partner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mobile</Label>
                <Input inputMode="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Profit Share %</Label>
                <Input type="number" inputMode="decimal" step="0.01"
                  value={form.profitSharePercentage}
                  onChange={e => setForm(f => ({ ...f, profitSharePercentage: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Investment (₹)</Label>
                <Input type="number" inputMode="decimal" step="0.01"
                  value={form.investmentAmount}
                  onChange={e => setForm(f => ({ ...f, investmentAmount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete partner?</AlertDialogTitle>
            <AlertDialogDescription>
              Past expenses & withdrawals tied to this partner will still exist but lose the linked name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Building2, UserCheck, UserX, Users } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface BusinessRow {
  id: string;
  name: string;
  approved: boolean;
  created_at: string;
  member_count: number;
  purchase_count: number;
  sale_count: number;
  expense_count: number;
}

interface PendingRow {
  id: string;
  user_id: string;
  email: string;
  requested_business_name: string | null;
  status: string;
  created_at: string;
}

export default function SuperAdminBusinesses() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bizNames, setBizNames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('business_overview' as never).select('*').order('created_at', { ascending: false }),
      supabase.from('pending_signups').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setBusinesses((b ?? []) as BusinessRow[]);
    setPending((p ?? []) as PendingRow[]);
    setLoading(false);
  };

  useEffect(() => { document.title = 'Super Admin · Businesses'; load(); }, []);

  const approve = async (userId: string) => {
    const name = bizNames[userId]?.trim();
    if (!name) return toast.error('Enter a business name first');
    const { error } = await supabase.rpc('approve_signup_as_business_admin', {
      _user_id: userId, _business_name: name,
    });
    if (error) return toast.error(error.message);
    toast.success(`${name} created`);
    load();
  };

  const reject = async (userId: string) => {
    const { error } = await supabase.rpc('reject_signup', { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success('Signup rejected');
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">All Businesses (Super Admin)</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-warning" />
            Pending Signups ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Koi pending signup nahi.</p>}
          {pending.map(p => (
            <div key={p.id} className="rounded-lg border p-3 space-y-2">
              <div>
                <p className="font-medium text-sm">{p.email}</p>
                <p className="text-xs text-muted-foreground">Requested {formatDate(p.created_at)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Business name to assign</Label>
                <Input
                  placeholder="e.g. Sunny Traders"
                  value={bizNames[p.user_id] ?? ''}
                  onChange={e => setBizNames(s => ({ ...s, [p.user_id]: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => approve(p.user_id)}>
                  <UserCheck className="mr-1 h-3.5 w-3.5" /> Approve as Admin
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reject(p.user_id)}>
                  <UserX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Active Businesses ({businesses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {businesses.map(b => (
            <div key={b.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">Since {formatDate(b.created_at)}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {b.member_count}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{b.purchase_count} purchases</span>
                <span>{b.sale_count} sales</span>
                <span>{b.expense_count} expenses</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

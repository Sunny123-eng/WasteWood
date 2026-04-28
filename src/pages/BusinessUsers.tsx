import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';

interface MemberRow {
  id: string;
  user_id: string;
  role: 'business_admin' | 'business_user';
  created_at: string;
}

export default function BusinessUsers() {
  const { currentBusinessId, business, isBusinessAdmin } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'business_admin' | 'business_user'>('business_user');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const { data } = await supabase
      .from('business_members')
      .select('id, user_id, role, created_at')
      .eq('business_id', currentBusinessId)
      .order('created_at', { ascending: true });
    const list = (data ?? []) as MemberRow[];
    setMembers(list);
    setEmailMap({});
    setLoading(false);
  };

  useEffect(() => { document.title = 'Manage Users'; load(); }, [currentBusinessId]);

  const invite = async () => {
    if (!inviteEmail.trim() || !currentBusinessId) return;
    setBusy(true);
    try {
      const { data: uid, error: e1 } = await supabase.rpc('find_user_by_email', { _email: inviteEmail.trim() });
      if (e1) throw e1;
      if (!uid) {
        toast.error('User not found. Unhe pehle signup karna hoga.');
        return;
      }
      const { error: e2 } = await supabase.rpc('add_user_to_business', {
        _user_id: uid, _business_id: currentBusinessId, _role: inviteRole,
      });
      if (e2) throw e2;
      toast.success('User added');
      setInviteEmail('');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const removeMember = async (m: MemberRow) => {
    if (!confirm('Remove this user from the business?')) return;
    const { error } = await supabase.from('business_members').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    toast.success('Removed');
    load();
  };

  if (!isBusinessAdmin) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Only business admin can manage users.</div>;
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">Manage Users</h1>
      <p className="text-xs text-muted-foreground">Business: <strong>{business?.name}</strong></p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Invite User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            User ko pehle signup karna padega. Fir uska email yahan dalkar role assign karein.
          </p>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={v => setInviteRole(v as 'business_admin' | 'business_user')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="business_user">User (view + add entries)</SelectItem>
                <SelectItem value="business_admin">Admin (full edit/delete)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={invite} className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" /> Add User</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
          {!loading && members.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{emailMap[m.user_id] ?? m.user_id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.role.replace('_', ' ')}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeMember(m)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

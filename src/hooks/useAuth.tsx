import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'super_admin' | 'business_admin' | 'business_user' | null;

interface BusinessInfo {
  id: string;
  name: string;
  role: 'business_admin' | 'business_user';
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  /** Highest-priority role for the user. */
  role: AppRole;
  /** True for super_admin (smpanchal9665) — view-only across all businesses. */
  isSuperAdmin: boolean;
  /** True for business_admin within their own business — can full CRUD. */
  isBusinessAdmin: boolean;
  /** True for business_user — can view & insert new entries only. */
  isBusinessUser: boolean;
  /** Backwards-compat: treat business_admin as "admin" for write-gating UI. */
  isAdmin: boolean;
  /** Current business context (first membership) — null for super_admin or pending users. */
  business: BusinessInfo | null;
  /** Convenience: business id only. */
  currentBusinessId: string | null;
  /** Pending signup awaiting super-admin approval. */
  isPending: boolean;
  loading: boolean;
  refreshContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, role: null,
  isSuperAdmin: false, isBusinessAdmin: false, isBusinessUser: false, isAdmin: false,
  business: null, currentBusinessId: null, isPending: false, loading: true,
  refreshContext: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContext = useCallback(async (userId: string) => {
    // Check super admin role first
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleRow?.role === 'super_admin') {
      setRole('super_admin');
      setBusiness(null);
      setIsPending(false);
      setLoading(false);
      return;
    }

    // Otherwise look up business membership
    const { data: memberRows } = await supabase
      .from('business_members')
      .select('business_id, role, businesses(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    const m = memberRows?.[0] as { business_id: string; role: 'business_admin' | 'business_user'; businesses: { id: string; name: string } | null } | undefined;

    if (m && m.businesses) {
      setBusiness({ id: m.businesses.id, name: m.businesses.name, role: m.role });
      setRole(m.role);
      setIsPending(false);
    } else {
      // Pending — check pending_signups
      const { data: pend } = await supabase
        .from('pending_signups')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      setBusiness(null);
      setRole(null);
      setIsPending(pend?.status === 'pending' || !pend);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => fetchContext(s.user.id), 0);
      } else {
        setRole(null); setBusiness(null); setIsPending(false); setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchContext(s.user.id);
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchContext]);

  const refreshContext = useCallback(async () => {
    if (session?.user) await fetchContext(session.user.id);
  }, [session, fetchContext]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const isSuperAdmin = role === 'super_admin';
  const isBusinessAdmin = role === 'business_admin';
  const isBusinessUser = role === 'business_user';

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null,
      role, isSuperAdmin, isBusinessAdmin, isBusinessUser,
      isAdmin: isBusinessAdmin, // legacy: write-gating
      business, currentBusinessId: business?.id ?? null,
      isPending, loading,
      refreshContext, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

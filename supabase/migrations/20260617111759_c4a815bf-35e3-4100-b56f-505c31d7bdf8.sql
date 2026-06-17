
-- 1) Drop legacy checks so expenses.paid_by and withdrawals.person can store
--    either the literal 'business' or a partner uuid (as text).
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_paid_by_check;
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_person_check;

-- 2) Enforce one-business-per-owner.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_unique
  ON public.businesses(owner_id) WHERE owner_id IS NOT NULL;

-- 3) Partners table.
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  mobile text,
  email text,
  profit_share_percentage numeric NOT NULL DEFAULT 0,
  investment_amount numeric NOT NULL DEFAULT 0,
  notes text,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_business ON public.partners(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_partners" ON public.partners FOR SELECT TO authenticated
  USING (public.can_read_business(business_id));
CREATE POLICY "ins_partners" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_partners" ON public.partners FOR UPDATE TO authenticated
  USING (public.can_admin_business(business_id))
  WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_partners" ON public.partners FOR DELETE TO authenticated
  USING (public.can_admin_business(business_id));

DROP TRIGGER IF EXISTS trg_partners_updated ON public.partners;
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Backfill default Owner partner for every existing business that has none.
INSERT INTO public.partners (business_id, partner_name, profit_share_percentage, is_owner)
SELECT b.id, 'Owner', 100, true
FROM public.businesses b
WHERE NOT EXISTS (SELECT 1 FROM public.partners p WHERE p.business_id = b.id);

-- 5) Refresh approve_signup_as_business_admin to also seed default partner.
CREATE OR REPLACE FUNCTION public.approve_signup_as_business_admin(_user_id uuid, _business_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_biz_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can approve signups';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RAISE EXCEPTION 'This user already owns a business';
  END IF;
  INSERT INTO public.businesses (name, owner_id, approved)
  VALUES (_business_name, _user_id, true) RETURNING id INTO v_biz_id;
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_biz_id, _user_id, 'business_admin');
  INSERT INTO public.balances (business_id, cash, bank) VALUES (v_biz_id, 0, 0);
  INSERT INTO public.settings (business_id, sunny_pct, partner_pct, default_expense_paid_by)
  VALUES (v_biz_id, 50, 50, 'business');
  INSERT INTO public.partners (business_id, partner_name, profit_share_percentage, is_owner)
  VALUES (v_biz_id, 'Owner', 100, true);
  UPDATE public.pending_signups SET status='approved' WHERE user_id = _user_id;
  RETURN v_biz_id;
END; $$;

-- 6) pending_signups: add explicit RLS so each user can only insert their own row.
DROP POLICY IF EXISTS "ins_pending_own" ON public.pending_signups;
CREATE POLICY "ins_pending_own" ON public.pending_signups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7) Lock down user_roles writes to super admins only.
DROP POLICY IF EXISTS "ins_user_roles_super" ON public.user_roles;
DROP POLICY IF EXISTS "upd_user_roles_super" ON public.user_roles;
DROP POLICY IF EXISTS "del_user_roles_super" ON public.user_roles;
CREATE POLICY "ins_user_roles_super" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "upd_user_roles_super" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "del_user_roles_super" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 8) Revoke EXECUTE on internal helper functions from anon/public (still callable
--    via RLS policies because they're security definer).
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_read_business(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_admin_business(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_insert_business(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_business_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon, public;

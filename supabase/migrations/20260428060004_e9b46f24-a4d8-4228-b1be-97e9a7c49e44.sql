-- =====================================================================
-- 1. NEW TABLES
-- =====================================================================
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('business_admin','business_user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  requested_business_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. SECURITY DEFINER HELPERS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'super_admin'::public.app_role) $$;

CREATE OR REPLACE FUNCTION public.is_business_member(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = auth.uid() AND role = 'business_admin')
$$;

CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT business_id FROM public.business_members
  WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_business(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_super_admin() OR public.is_business_member(_business_id) $$;

CREATE OR REPLACE FUNCTION public.can_admin_business(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_business_admin(_business_id) $$;

CREATE OR REPLACE FUNCTION public.can_insert_business(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_business_member(_business_id) $$;

-- Lock down helpers to authenticated only
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_business_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_business(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_admin_business(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_insert_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_admin_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_business(uuid) TO authenticated;

-- =====================================================================
-- 3. POLICIES on new tables
-- =====================================================================
CREATE POLICY "Read businesses" ON public.businesses FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_business_member(id));
CREATE POLICY "Super admin manage businesses" ON public.businesses FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Business admin update own business" ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_business_admin(id)) WITH CHECK (public.is_business_admin(id));

CREATE POLICY "Read members" ON public.business_members FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_business_member(business_id) OR user_id = auth.uid());
CREATE POLICY "Super admin manage members" ON public.business_members FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Business admin manage own members" ON public.business_members FOR ALL TO authenticated
  USING (public.is_business_admin(business_id)) WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "User reads own pending" ON public.pending_signups FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Super admin manages pending" ON public.pending_signups FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- =====================================================================
-- 4. ADD business_id columns
-- =====================================================================
ALTER TABLE public.sawmills          ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.parties           ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.purchases         ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.sales             ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.expenses          ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.payments_received ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.payments_made     ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.withdrawals       ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_archives  ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.balances          ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.settings          ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- =====================================================================
-- 5. CREATE Darshan Traders + MIGRATE EXISTING DATA
-- =====================================================================
DO $$
DECLARE
  v_dt_id uuid;
  v_super_id uuid := '28eee5d3-ca07-407d-a9d8-08957bc551b1';
  v_dt_admin_id uuid;
BEGIN
  INSERT INTO public.businesses (name, approved) VALUES ('Darshan Traders', true) RETURNING id INTO v_dt_id;

  SELECT id INTO v_dt_admin_id FROM auth.users WHERE lower(email) = 'sp96655268@gmail.com' LIMIT 1;
  IF v_dt_admin_id IS NOT NULL THEN
    UPDATE public.businesses SET owner_id = v_dt_admin_id WHERE id = v_dt_id;
    INSERT INTO public.business_members (business_id, user_id, role) VALUES (v_dt_id, v_dt_admin_id, 'business_admin') ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.sawmills          SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.parties           SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.purchases         SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.sales             SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.expenses          SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.payments_received SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.payments_made     SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.withdrawals       SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.monthly_archives  SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.balances          SET business_id = v_dt_id WHERE business_id IS NULL;
  UPDATE public.settings          SET business_id = v_dt_id WHERE business_id IS NULL;

  -- promote super admin
  DELETE FROM public.user_roles WHERE user_id = v_super_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_super_id, 'super_admin') ON CONFLICT DO NOTHING;
END $$;

-- =====================================================================
-- 6. Enforce NOT NULL
-- =====================================================================
ALTER TABLE public.sawmills          ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.parties           ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.purchases         ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.sales             ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.expenses          ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.payments_received ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.payments_made     ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.withdrawals       ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.monthly_archives  ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.balances          ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.settings          ALTER COLUMN business_id SET NOT NULL;

-- balances/settings: convert from singleton to per-business
ALTER TABLE public.balances DROP CONSTRAINT IF EXISTS balances_pkey;
ALTER TABLE public.balances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.balances ALTER COLUMN id DROP NOT NULL;
ALTER TABLE public.balances ADD COLUMN pk_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.balances ADD PRIMARY KEY (pk_id);
ALTER TABLE public.balances ADD CONSTRAINT balances_business_unique UNIQUE (business_id);

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE public.settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.settings ALTER COLUMN id DROP NOT NULL;
ALTER TABLE public.settings ADD COLUMN pk_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.settings ADD PRIMARY KEY (pk_id);
ALTER TABLE public.settings ADD CONSTRAINT settings_business_unique UNIQUE (business_id);

-- Indexes
CREATE INDEX idx_sawmills_business    ON public.sawmills(business_id);
CREATE INDEX idx_parties_business     ON public.parties(business_id);
CREATE INDEX idx_purchases_business   ON public.purchases(business_id);
CREATE INDEX idx_sales_business       ON public.sales(business_id);
CREATE INDEX idx_expenses_business    ON public.expenses(business_id);
CREATE INDEX idx_pr_business          ON public.payments_received(business_id);
CREATE INDEX idx_pm_business          ON public.payments_made(business_id);
CREATE INDEX idx_withdrawals_business ON public.withdrawals(business_id);
CREATE INDEX idx_archives_business    ON public.monthly_archives(business_id);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);

-- =====================================================================
-- 7. REPLACE RLS POLICIES on all data tables
-- =====================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('sawmills','parties','purchases','sales','expenses',
                        'payments_received','payments_made','withdrawals',
                        'monthly_archives','balances','settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "sel_sawmills" ON public.sawmills FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_sawmills" ON public.sawmills FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_sawmills" ON public.sawmills FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_sawmills" ON public.sawmills FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_parties" ON public.parties FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_parties" ON public.parties FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_parties" ON public.parties FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_parties" ON public.parties FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_purchases" ON public.purchases FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.can_insert_business(business_id));
CREATE POLICY "upd_purchases" ON public.purchases FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_purchases" ON public.purchases FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_sales" ON public.sales FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.can_insert_business(business_id));
CREATE POLICY "upd_sales" ON public.sales FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_sales" ON public.sales FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_expenses" ON public.expenses FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.can_insert_business(business_id));
CREATE POLICY "upd_expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_expenses" ON public.expenses FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_pr" ON public.payments_received FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_pr" ON public.payments_received FOR INSERT TO authenticated WITH CHECK (public.can_insert_business(business_id));
CREATE POLICY "upd_pr" ON public.payments_received FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_pr" ON public.payments_received FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_pm" ON public.payments_made FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_pm" ON public.payments_made FOR INSERT TO authenticated WITH CHECK (public.can_insert_business(business_id));
CREATE POLICY "upd_pm" ON public.payments_made FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_pm" ON public.payments_made FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_w" ON public.withdrawals FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_w" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_w" ON public.withdrawals FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_w" ON public.withdrawals FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_arch" ON public.monthly_archives FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_arch" ON public.monthly_archives FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "del_arch" ON public.monthly_archives FOR DELETE TO authenticated USING (public.can_admin_business(business_id));

CREATE POLICY "sel_balances" ON public.balances FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_balances" ON public.balances FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_balances" ON public.balances FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));

CREATE POLICY "sel_settings" ON public.settings FOR SELECT TO authenticated USING (public.can_read_business(business_id));
CREATE POLICY "ins_settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.can_admin_business(business_id));
CREATE POLICY "upd_settings" ON public.settings FOR UPDATE TO authenticated USING (public.can_admin_business(business_id)) WITH CHECK (public.can_admin_business(business_id));

-- =====================================================================
-- 8. UPDATE handle_new_user (replace email allow-list with multi-tenant flow)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(NEW.email);
  v_dt_id uuid;
BEGIN
  IF v_email = 'smpanchal9665@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  IF v_email = 'sp96655268@gmail.com' THEN
    SELECT id INTO v_dt_id FROM public.businesses WHERE name = 'Darshan Traders' LIMIT 1;
    IF v_dt_id IS NOT NULL THEN
      UPDATE public.businesses SET owner_id = NEW.id WHERE id = v_dt_id AND owner_id IS NULL;
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES (v_dt_id, NEW.id, 'business_admin') ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.pending_signups (user_id, email)
  VALUES (NEW.id, v_email) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 9. APPROVAL RPCs
-- =====================================================================
CREATE OR REPLACE FUNCTION public.approve_signup_as_business_admin(
  _user_id uuid, _business_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_biz_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can approve signups';
  END IF;
  INSERT INTO public.businesses (name, owner_id, approved)
  VALUES (_business_name, _user_id, true) RETURNING id INTO v_biz_id;
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_biz_id, _user_id, 'business_admin');
  INSERT INTO public.balances (business_id, cash, bank) VALUES (v_biz_id, 0, 0);
  INSERT INTO public.settings (business_id, sunny_pct, partner_pct, default_expense_paid_by)
  VALUES (v_biz_id, 50, 50, 'business');
  UPDATE public.pending_signups SET status='approved' WHERE user_id = _user_id;
  RETURN v_biz_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_user_to_business(
  _user_id uuid, _business_id uuid, _role text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_business_admin(_business_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _role NOT IN ('business_admin','business_user') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (_business_id, _user_id, _role)
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.pending_signups SET status='approved' WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_signup(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  UPDATE public.pending_signups SET status='rejected' WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_signup_as_business_admin(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_user_to_business(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_signup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_signup_as_business_admin(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_to_business(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_signup(uuid) TO authenticated;

-- =====================================================================
-- 10. Helper to look up auth user by email (for super admin to find users)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (public.is_super_admin() OR auth.uid() IS NOT NULL) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
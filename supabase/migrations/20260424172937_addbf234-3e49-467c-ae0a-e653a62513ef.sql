
-- =========================
-- ROLES
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Auto-assign role on signup based on email; reject other emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(NEW.email);
BEGIN
  IF v_email = 'smpanchal9665@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSIF v_email = 'sp96655268@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Signups are restricted. Contact admin.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- SHARED HELPERS
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- MASTER: SAWMILLS
-- =========================
CREATE TABLE public.sawmills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_rate NUMERIC NOT NULL DEFAULT 0,
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sawmills ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sawmills_updated BEFORE UPDATE ON public.sawmills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Authenticated read sawmills" ON public.sawmills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert sawmills" ON public.sawmills FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update sawmills" ON public.sawmills FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete sawmills" ON public.sawmills FOR DELETE TO authenticated USING (public.is_admin());

-- =========================
-- MASTER: PARTIES
-- =========================
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_parties_updated BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Authenticated read parties" ON public.parties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert parties" ON public.parties FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update parties" ON public.parties FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete parties" ON public.parties FOR DELETE TO authenticated USING (public.is_admin());

-- =========================
-- TRANSACTIONS
-- =========================
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sawmill_id UUID REFERENCES public.sawmills(id) ON DELETE RESTRICT NOT NULL,
  sawmill_name TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  vehicle_number TEXT,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','bank','credit')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update purchases" ON public.purchases FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete purchases" ON public.purchases FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  vehicle_number TEXT,
  bill_number TEXT NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','bank','credit')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update sales" ON public.sales FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete sales" ON public.sales FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid_by TEXT NOT NULL CHECK (paid_by IN ('business','sunny','partner')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','bank')),
  vehicle_number TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.payments_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','bank')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments_received ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.payments_received FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read pr" ON public.payments_received FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert pr" ON public.payments_received FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update pr" ON public.payments_received FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete pr" ON public.payments_received FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.payments_made (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sawmill_id UUID REFERENCES public.sawmills(id) ON DELETE RESTRICT NOT NULL,
  sawmill_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','bank')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments_made ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.payments_made FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read pm" ON public.payments_made FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert pm" ON public.payments_made FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update pm" ON public.payments_made FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete pm" ON public.payments_made FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  person TEXT NOT NULL CHECK (person IN ('sunny','partner')),
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('cash','bank')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_w_updated BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read w" ON public.withdrawals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert w" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update w" ON public.withdrawals FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete w" ON public.withdrawals FOR DELETE TO authenticated USING (public.is_admin());

-- =========================
-- SINGLETONS: BALANCES, SETTINGS
-- =========================
CREATE TABLE public.balances (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cash NUMERIC NOT NULL DEFAULT 0,
  bank NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.balances (id, cash, bank) VALUES (1, 0, 0);
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bal_updated BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read balances" ON public.balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update balances" ON public.balances FOR UPDATE TO authenticated USING (public.is_admin());

CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sunny_pct NUMERIC NOT NULL DEFAULT 50,
  partner_pct NUMERIC NOT NULL DEFAULT 50,
  default_expense_paid_by TEXT NOT NULL DEFAULT 'business',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.settings (id) VALUES (1);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_set_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Auth read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update settings" ON public.settings FOR UPDATE TO authenticated USING (public.is_admin());

-- =========================
-- MONTHLY ARCHIVES
-- =========================
CREATE TABLE public.monthly_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  totals JSONB NOT NULL,
  data JSONB NOT NULL,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read archives" ON public.monthly_archives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert archives" ON public.monthly_archives FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete archives" ON public.monthly_archives FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- PHASE 1: ACCOUNTING FOUNDATION TABLES
-- =============================================================

-- 1. Account type enum
CREATE TYPE public.account_type AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');

-- 2. Account subtype enum
CREATE TYPE public.account_subtype AS ENUM ('Cash', 'Bank', 'Receivable', 'Payable', 'Fixed Asset', 'Accumulated Depreciation', 'Current Liability', 'Long Term Liability', 'Equity', 'Revenue', 'Cost of Sales', 'Expense', 'Other');

-- 3. Journal type enum
CREATE TYPE public.journal_type AS ENUM ('opening_balance', 'requisition_approval', 'manual', 'payment', 'receipt', 'revenue', 'expense', 'depreciation', 'reversal');

-- 4. Payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank');

-- =============================================================
-- CHART OF ACCOUNTS
-- =============================================================
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type public.account_type NOT NULL,
  account_subtype public.account_subtype NOT NULL DEFAULT 'Other',
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read COA (needed for dropdowns)
CREATE POLICY "Authenticated users can view COA"
  ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (true);

-- Accountants and CEO can manage COA
CREATE POLICY "Accountants can insert COA"
  ON public.chart_of_accounts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update COA"
  ON public.chart_of_accounts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- Trigger for updated_at
CREATE TRIGGER update_coa_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- JOURNALS (Header)
-- =============================================================
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number TEXT NOT NULL UNIQUE,
  journal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  journal_type public.journal_type NOT NULL,
  reference_type TEXT DEFAULT NULL, -- 'requisition', 'payment', etc.
  reference_id UUID DEFAULT NULL,
  is_posted BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  payment_method public.payment_method DEFAULT NULL,
  payment_reference TEXT DEFAULT '',
  payment_account_id UUID REFERENCES public.chart_of_accounts(id) DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view journals (for linking/reporting)
CREATE POLICY "Authenticated users can view journals"
  ON public.journals FOR SELECT TO authenticated
  USING (true);

-- Accountants can insert/update journals
CREATE POLICY "Accountants can insert journals"
  ON public.journals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update journals"
  ON public.journals FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- Auto-generate journal number
CREATE OR REPLACE FUNCTION public.generate_journal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(journal_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.journals;
  NEW.journal_number := 'JN-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_journal_number_trigger
  BEFORE INSERT ON public.journals
  FOR EACH ROW EXECUTE FUNCTION public.generate_journal_number();

CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON public.journals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- JOURNAL LINES
-- =============================================================
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journal lines"
  ON public.journal_lines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can insert journal lines"
  ON public.journal_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update journal lines"
  ON public.journal_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can delete journal lines"
  ON public.journal_lines FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- SYSTEM SETTINGS
-- =============================================================
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can update settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can insert settings"
  ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- Insert default accounting method
INSERT INTO public.system_settings (key, value) VALUES ('accounting_method', 'cash');

-- =============================================================
-- ATTACHMENTS
-- =============================================================
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'requisition', 'journal', 'payment', 'receipt'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upload attachments"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Accountants can delete attachments"
  ON public.attachments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- ADD rejection_reason TO requisitions
-- =============================================================
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS approved_by UUID DEFAULT NULL;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES public.journals(id) DEFAULT NULL;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS payment_method public.payment_method DEFAULT NULL;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES public.chart_of_accounts(id) DEFAULT NULL;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES public.chart_of_accounts(id) DEFAULT NULL;

-- =============================================================
-- AUDIT TRAIL
-- =============================================================
CREATE TABLE public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'submit', 'approve', 'reject', 'post', 'reverse'
  details JSONB DEFAULT '{}',
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit trail"
  ON public.audit_trail FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit trail"
  ON public.audit_trail FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = performed_by);

-- =============================================================
-- DEPARTMENT BUDGETS (optional)
-- =============================================================
CREATE TABLE public.department_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  month DATE NOT NULL, -- first day of month
  budget_limit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department, month)
);

ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budgets"
  ON public.department_budgets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can manage budgets"
  ON public.department_budgets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update budgets"
  ON public.department_budgets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- ASSETS REGISTER
-- =============================================================
CREATE TABLE public.assets_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  location TEXT DEFAULT '',
  cost NUMERIC NOT NULL DEFAULT 0,
  acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  useful_life_months INTEGER NOT NULL DEFAULT 60,
  residual_value NUMERIC NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, disposed, fully_depreciated
  requisition_id UUID REFERENCES public.requisitions(id) DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assets_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assets"
  ON public.assets_register FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can manage assets"
  ON public.assets_register FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update assets"
  ON public.assets_register FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- LIABILITIES REGISTER
-- =============================================================
CREATE TABLE public.liabilities_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  liability_type TEXT NOT NULL DEFAULT 'loan', -- loan, tax, other
  original_amount NUMERIC NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  maturity_date DATE DEFAULT NULL,
  creditor TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active', -- active, paid_off, written_off
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.liabilities_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view liabilities"
  ON public.liabilities_register FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can manage liabilities"
  ON public.liabilities_register FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update liabilities"
  ON public.liabilities_register FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- PAYABLES & RECEIVABLES (for accrual basis)
-- =============================================================
CREATE TABLE public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  due_date DATE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'outstanding', -- outstanding, partial, paid
  requisition_id UUID REFERENCES public.requisitions(id) DEFAULT NULL,
  journal_id UUID REFERENCES public.journals(id) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payables"
  ON public.payables FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can manage payables"
  ON public.payables FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update payables"
  ON public.payables FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  due_date DATE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'outstanding', -- outstanding, partial, received
  journal_id UUID REFERENCES public.journals(id) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receivables"
  ON public.receivables FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Accountants can manage receivables"
  ON public.receivables FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

CREATE POLICY "Accountants can update receivables"
  ON public.receivables FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- ENABLE REALTIME
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.journals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chart_of_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receivables;

-- =============================================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- =============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Authenticated users can upload to attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Accountants can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')
  ));

-- =============================================================
-- SEED DEFAULT CHART OF ACCOUNTS
-- =============================================================
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype) VALUES
-- Assets
('1000', 'Cash on Hand', 'Asset', 'Cash'),
('1010', 'Petty Cash', 'Asset', 'Cash'),
('1100', 'Main Bank Account', 'Asset', 'Bank'),
('1110', 'Operations Bank Account', 'Asset', 'Bank'),
('1200', 'Accounts Receivable', 'Asset', 'Receivable'),
('1300', 'Prepaid Expenses', 'Asset', 'Other'),
('1500', 'Office Equipment', 'Asset', 'Fixed Asset'),
('1510', 'Computer Equipment', 'Asset', 'Fixed Asset'),
('1520', 'Furniture & Fixtures', 'Asset', 'Fixed Asset'),
('1530', 'Vehicles', 'Asset', 'Fixed Asset'),
('1600', 'Accumulated Depreciation - Equipment', 'Asset', 'Accumulated Depreciation'),
('1610', 'Accumulated Depreciation - Computers', 'Asset', 'Accumulated Depreciation'),
('1620', 'Accumulated Depreciation - Furniture', 'Asset', 'Accumulated Depreciation'),
('1630', 'Accumulated Depreciation - Vehicles', 'Asset', 'Accumulated Depreciation'),
-- Liabilities
('2000', 'Accounts Payable', 'Liability', 'Payable'),
('2100', 'Accrued Expenses', 'Liability', 'Current Liability'),
('2200', 'VAT/Tax Payable', 'Liability', 'Current Liability'),
('2300', 'Salaries Payable', 'Liability', 'Current Liability'),
('2500', 'Long Term Loans', 'Liability', 'Long Term Liability'),
-- Equity
('3000', 'Opening Balance Equity', 'Equity', 'Equity'),
('3100', 'Retained Earnings', 'Equity', 'Equity'),
('3200', 'Owner''s Capital', 'Equity', 'Equity'),
-- Revenue
('4000', 'Sales Revenue', 'Revenue', 'Revenue'),
('4100', 'Service Revenue', 'Revenue', 'Revenue'),
('4200', 'Interest Income', 'Revenue', 'Revenue'),
('4300', 'Other Income', 'Revenue', 'Revenue'),
-- Expenses
('5000', 'Office Supplies', 'Expense', 'Expense'),
('5010', 'Printing & Stationery', 'Expense', 'Expense'),
('5100', 'Rent Expense', 'Expense', 'Expense'),
('5200', 'Utilities', 'Expense', 'Expense'),
('5300', 'Salaries & Wages', 'Expense', 'Expense'),
('5400', 'Travel & Transport', 'Expense', 'Expense'),
('5500', 'Repairs & Maintenance', 'Expense', 'Expense'),
('5600', 'Insurance', 'Expense', 'Expense'),
('5700', 'Professional Fees', 'Expense', 'Expense'),
('5800', 'Marketing & Advertising', 'Expense', 'Expense'),
('5900', 'Depreciation Expense', 'Expense', 'Expense'),
('5950', 'Bank Charges', 'Expense', 'Expense'),
('5960', 'Miscellaneous Expense', 'Expense', 'Expense'),
('6000', 'Cost of Goods Sold', 'Expense', 'Cost of Sales');

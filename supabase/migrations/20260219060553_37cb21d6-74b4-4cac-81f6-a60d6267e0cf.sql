
-- Create quotations table
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quotation items table
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Quotation policies
CREATE POLICY "Accountants can manage quotations" ON public.quotations
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')));

CREATE POLICY "Accountants can manage quotation items" ON public.quotation_items
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('accountant', 'ceo')));

-- Auto-generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM public.quotations;
  NEW.quotation_number := 'QUO-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_quotation_number
BEFORE INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_number();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;

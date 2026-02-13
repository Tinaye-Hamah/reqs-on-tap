
-- Create cashbook table
CREATE TABLE public.cashbook (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID REFERENCES public.requisitions(id) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashbook ENABLE ROW LEVEL SECURITY;

-- Only accountants can view cashbook
CREATE POLICY "Accountants can view cashbook"
ON public.cashbook
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'accountant'
  )
);

-- Only accountants can insert into cashbook
CREATE POLICY "Accountants can insert cashbook"
ON public.cashbook
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'accountant'
  )
);

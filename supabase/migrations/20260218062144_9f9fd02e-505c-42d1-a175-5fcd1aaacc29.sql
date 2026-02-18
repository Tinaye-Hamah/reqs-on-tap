-- Add tables to realtime individually with IF NOT EXISTS approach
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chart_of_accounts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.receivables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Allow DELETE on chart_of_accounts for accountants
CREATE POLICY "Accountants can delete COA"
ON public.chart_of_accounts
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('accountant', 'ceo')
));
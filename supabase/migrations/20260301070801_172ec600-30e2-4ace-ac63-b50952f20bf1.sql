
-- Allow managers to manage quotations
DROP POLICY IF EXISTS "Accountants can manage quotations" ON quotations;
CREATE POLICY "Accountants and managers can manage quotations" ON quotations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can manage quotation items" ON quotation_items;
CREATE POLICY "Accountants and managers can manage quotation items" ON quotation_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

-- Update journal insert policy to include managers
DROP POLICY IF EXISTS "Accountants can insert journals" ON journals;
CREATE POLICY "Accountants and managers can insert journals" ON journals FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can insert journal lines" ON journal_lines;
CREATE POLICY "Accountants and managers can insert journal lines" ON journal_lines FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can manage receivables" ON receivables;
CREATE POLICY "Accountants and managers can manage receivables" ON receivables FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can update receivables" ON receivables;
CREATE POLICY "Accountants and managers can update receivables" ON receivables FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can insert cashbook" ON cashbook;
CREATE POLICY "Accountants and managers can insert cashbook" ON cashbook FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

DROP POLICY IF EXISTS "Accountants can view cashbook" ON cashbook;
CREATE POLICY "Elevated can view cashbook" ON cashbook FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('accountant', 'manager', 'ceo')));

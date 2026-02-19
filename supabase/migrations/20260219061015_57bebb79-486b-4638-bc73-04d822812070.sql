
-- Allow CEO to update profiles (for department assignment)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or CEO can update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ceo'
));

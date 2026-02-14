
-- Allow CEO to update user roles
CREATE POLICY "CEO can update user roles"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ceo'
  )
);

-- Allow CEO to view all profiles
-- (already covered by has_elevated_role in existing policy)

-- Allow CEO to view all user roles (already covered by has_elevated_role)

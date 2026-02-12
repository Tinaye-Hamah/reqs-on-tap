
-- Drop dependent policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Admins can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can view own requisition items" ON public.requisition_items;

-- Now drop function, table, type
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS public.app_role;

-- Recreate with expanded roles
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'accountant', 'ceo');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Check if user has elevated role
CREATE OR REPLACE FUNCTION public.has_elevated_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('manager', 'accountant', 'ceo')
  )
$$;

-- user_roles RLS
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_elevated_role(auth.uid()));
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- profiles RLS
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_elevated_role(auth.uid()));

-- requisitions RLS
CREATE POLICY "View requisitions" ON public.requisitions FOR SELECT USING (auth.uid() = user_id OR public.has_elevated_role(auth.uid()));
CREATE POLICY "Elevated can update requisitions" ON public.requisitions FOR UPDATE USING (public.has_elevated_role(auth.uid()));

-- requisition_items RLS
CREATE POLICY "View requisition items" ON public.requisition_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.requisitions WHERE id = requisition_id AND (user_id = auth.uid() OR public.has_elevated_role(auth.uid())))
);

-- Auto-assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

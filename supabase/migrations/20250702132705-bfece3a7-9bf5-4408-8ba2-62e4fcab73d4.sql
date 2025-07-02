
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can create new admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can delete admin users" ON public.admin_users;

-- Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Create new non-recursive policies using the function
CREATE POLICY "Admins can view all admin users" 
  ON public.admin_users 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create new admin users" 
  ON public.admin_users 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update admin users" 
  ON public.admin_users 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin users" 
  ON public.admin_users 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Update other tables that reference admin status to use the new function
DROP POLICY IF EXISTS "Admins can view all online status" ON public.user_online_status;
CREATE POLICY "Admins can view all online status" 
  ON public.user_online_status 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_logs;
CREATE POLICY "Admins can view webhook logs" 
  ON public.webhook_logs 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- Create a function to get user by email (needed for admin functionality)
CREATE OR REPLACE FUNCTION public.get_user_by_email(email_input TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id,
    auth.users.email::TEXT
  FROM auth.users
  WHERE auth.users.email = email_input;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO authenticated;

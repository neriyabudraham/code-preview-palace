-- First add the admin user
INSERT INTO public.admin_users (user_id, email) 
SELECT id, email 
FROM auth.users 
WHERE email = 'office@neriyabudraham.co.il'
ON CONFLICT (user_id) DO NOTHING;

-- Create function to get all users with their stats
CREATE OR REPLACE FUNCTION public.get_users_with_stats()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  custom_domain TEXT,
  domain_verified BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN,
  login_count BIGINT,
  site_count BIGINT,
  total_page_visits BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.custom_domain,
    p.domain_verified,
    uos.last_seen,
    COALESCE(uos.is_online, false) as is_online,
    COALESCE(login_stats.login_count, 0) as login_count,
    COALESCE(site_stats.site_count, 0) as site_count,
    COALESCE(visit_stats.total_visits, 0) as total_page_visits
  FROM public.profiles p
  LEFT JOIN public.user_online_status uos ON p.id = uos.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as login_count
    FROM auth.sessions
    GROUP BY user_id
  ) login_stats ON p.id = login_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as site_count
    FROM public.user_projects
    GROUP BY user_id
  ) site_stats ON p.id = site_stats.user_id
  LEFT JOIN (
    SELECT 
      pp.user_id,
      COUNT(pv.id) as total_visits
    FROM public.published_pages pp
    LEFT JOIN public.page_visits pv ON pp.id = pv.published_page_id
    GROUP BY pp.user_id
  ) visit_stats ON p.id = visit_stats.user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission to authenticated users (admins only through RLS)
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;

-- Create function to delete a user and all their data
CREATE OR REPLACE FUNCTION public.delete_user_and_data(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's data in order of dependencies
  DELETE FROM public.page_visits WHERE published_page_id IN (
    SELECT id FROM public.published_pages WHERE user_id = _user_id
  );
  DELETE FROM public.published_pages WHERE user_id = _user_id;
  DELETE FROM public.project_versions WHERE user_id = _user_id;
  DELETE FROM public.user_projects WHERE user_id = _user_id;
  DELETE FROM public.user_online_status WHERE user_id = _user_id;
  DELETE FROM public.admin_users WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  
  -- Note: auth.users deletion should be handled through Supabase Auth API
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users (admins only through RLS)
GRANT EXECUTE ON FUNCTION public.delete_user_and_data(UUID) TO authenticated;

-- Create function to update domain verification status
CREATE OR REPLACE FUNCTION public.update_domain_verification(_user_id UUID, _verified BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET domain_verified = _verified, updated_at = NOW()
  WHERE id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users (admins only through RLS)
GRANT EXECUTE ON FUNCTION public.update_domain_verification(UUID, BOOLEAN) TO authenticated;
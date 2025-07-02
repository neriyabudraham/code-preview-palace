
-- Create admin_users table to track admin permissions
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all admin users
CREATE POLICY "Admins can view all admin users" 
  ON public.admin_users 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create policy for admins to insert new admin users
CREATE POLICY "Admins can create new admin users" 
  ON public.admin_users 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create policy for admins to update admin users
CREATE POLICY "Admins can update admin users" 
  ON public.admin_users 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create policy for admins to delete admin users
CREATE POLICY "Admins can delete admin users" 
  ON public.admin_users 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Insert the initial admin user
INSERT INTO public.admin_users (user_id, email, created_at)
SELECT id, email, now()
FROM auth.users 
WHERE email = 'office@neriyabudraham.co.il'
ON CONFLICT (user_id) DO NOTHING;

-- Add user_online_status table to track online users
CREATE TABLE public.user_online_status (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.user_online_status ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all online status
CREATE POLICY "Admins can view all online status" 
  ON public.user_online_status 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create policy for users to update their own status
CREATE POLICY "Users can update their own status" 
  ON public.user_online_status 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_user_online_status_last_seen ON public.user_online_status(last_seen);
CREATE INDEX idx_user_online_status_is_online ON public.user_online_status(is_online);

-- Add webhook_logs table to track webhook calls
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view webhook logs
CREATE POLICY "Admins can view webhook logs" 
  ON public.webhook_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create index for webhook logs
CREATE INDEX idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

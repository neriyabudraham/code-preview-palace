
-- Create a table for project version history
CREATE TABLE public.project_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their own versions
CREATE POLICY "Users can view their own project versions" 
  ON public.project_versions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to insert their own versions
CREATE POLICY "Users can create their own project versions" 
  ON public.project_versions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to update their own versions
CREATE POLICY "Users can update their own project versions" 
  ON public.project_versions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to delete their own versions
CREATE POLICY "Users can delete their own project versions" 
  ON public.project_versions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_project_versions_project_id_user_id ON public.project_versions(project_id, user_id);
CREATE INDEX idx_project_versions_created_at ON public.project_versions(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_project_versions_updated_at
  BEFORE UPDATE ON public.project_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

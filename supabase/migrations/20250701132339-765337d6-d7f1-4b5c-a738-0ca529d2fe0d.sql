
-- Create a table for published pages
CREATE TABLE public.published_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  html_content TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.published_pages ENABLE ROW LEVEL SECURITY;

-- Create policy for public access to published pages (anyone can view)
CREATE POLICY "Anyone can view published pages" 
  ON public.published_pages 
  FOR SELECT 
  TO public
  USING (true);

-- Create policy that allows users to manage their own published pages
CREATE POLICY "Users can manage their own published pages" 
  ON public.published_pages 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Create index on slug for fast lookups
CREATE INDEX idx_published_pages_slug ON public.published_pages(slug);

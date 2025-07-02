
-- Create a table for tracking page visits
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  published_page_id UUID REFERENCES public.published_pages(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Create policy for public access to insert visits (anyone can log a visit)
CREATE POLICY "Anyone can log page visits" 
  ON public.page_visits 
  FOR INSERT 
  TO public
  WITH CHECK (true);

-- Create policy that allows page owners to view their page visits
CREATE POLICY "Page owners can view their page visits" 
  ON public.page_visits 
  FOR SELECT 
  USING (published_page_id IN (
    SELECT id FROM public.published_pages WHERE user_id = auth.uid()
  ));

-- Create index on slug for fast lookups
CREATE INDEX idx_page_visits_slug ON public.page_visits(slug);

-- Create index on published_page_id for fast lookups
CREATE INDEX idx_page_visits_published_page_id ON public.page_visits(published_page_id);

-- Create index on visited_at for date range queries
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at);

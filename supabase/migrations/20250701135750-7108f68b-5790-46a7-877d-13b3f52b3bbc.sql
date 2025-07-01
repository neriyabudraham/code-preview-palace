
-- Allow anonymous users to create published pages (for public publishing)
CREATE POLICY "Anonymous users can create published pages" 
  ON public.published_pages 
  FOR INSERT 
  WITH CHECK (user_id IS NULL);

-- Allow anonymous users to update published pages where user_id is null
CREATE POLICY "Anonymous users can update their published pages" 
  ON public.published_pages 
  FOR UPDATE 
  USING (user_id IS NULL);

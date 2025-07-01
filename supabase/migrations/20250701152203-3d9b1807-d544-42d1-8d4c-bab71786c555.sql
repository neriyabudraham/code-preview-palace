
-- Add custom domain field to profiles table
ALTER TABLE public.profiles ADD COLUMN custom_domain TEXT;

-- Create unique index on custom domain to prevent duplicates
CREATE UNIQUE INDEX idx_profiles_custom_domain ON public.profiles(custom_domain) WHERE custom_domain IS NOT NULL;

-- Add domain verification status column
ALTER TABLE public.profiles ADD COLUMN domain_verified BOOLEAN DEFAULT FALSE;

-- Update published_pages table to support custom domains
ALTER TABLE public.published_pages ADD COLUMN custom_domain TEXT;

-- Create index for custom domain lookups on published pages
CREATE INDEX idx_published_pages_custom_domain ON public.published_pages(custom_domain);

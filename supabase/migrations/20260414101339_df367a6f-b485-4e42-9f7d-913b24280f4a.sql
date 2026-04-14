
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cached listings table
CREATE TABLE public.cached_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  boat_type TEXT DEFAULT 'sailboat',
  price_eur NUMERIC,
  year INTEGER,
  length_feet NUMERIC,
  location TEXT,
  image_url TEXT,
  engine_info TEXT,
  source TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_cached_listings_scraped_at ON public.cached_listings (scraped_at DESC);
CREATE INDEX idx_cached_listings_boat_type ON public.cached_listings (boat_type);

-- Enable RLS
ALTER TABLE public.cached_listings ENABLE ROW LEVEL SECURITY;

-- Public read access (listings are public data)
CREATE POLICY "Anyone can view cached listings"
  ON public.cached_listings
  FOR SELECT
  USING (true);

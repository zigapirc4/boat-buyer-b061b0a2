-- Store raw structured specifications extracted from listing tables/feature blocks.
ALTER TABLE public.cached_listings
  ADD COLUMN IF NOT EXISTS specs_raw jsonb;

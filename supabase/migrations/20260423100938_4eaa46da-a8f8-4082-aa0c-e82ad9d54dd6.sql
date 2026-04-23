-- Add equipment column to cached_listings to store list of onboard equipment items
ALTER TABLE public.cached_listings ADD COLUMN IF NOT EXISTS equipment text[];
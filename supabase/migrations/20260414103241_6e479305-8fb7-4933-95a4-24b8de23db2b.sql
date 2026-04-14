
ALTER TABLE public.cached_listings
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_urls text[],
  ADD COLUMN IF NOT EXISTS hull_material text,
  ADD COLUMN IF NOT EXISTS engine_hours integer,
  ADD COLUMN IF NOT EXISTS cabins integer,
  ADD COLUMN IF NOT EXISTS fuel_type text;

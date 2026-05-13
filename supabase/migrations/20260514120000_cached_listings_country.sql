-- Canonical country per listing (for filters and geo); `location` keeps full display string.

ALTER TABLE public.cached_listings
  ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS idx_cached_listings_country
  ON public.cached_listings (country);

-- "Country->City"
UPDATE public.cached_listings
SET country = trim(split_part(location, '->', 1))
WHERE country IS NULL
  AND location IS NOT NULL
  AND location LIKE '%->%';

-- "City, ST" (US state code)
UPDATE public.cached_listings
SET country = 'United States'
WHERE country IS NULL
  AND location IS NOT NULL
  AND location NOT LIKE '%->%'
  AND location ~ ',\s*[A-Z]{2}\s*$';

-- "…, Country" (last comma segment)
UPDATE public.cached_listings
SET country = trim(substring(location from '\s*,\s*([^,]+)\s*$'))
WHERE country IS NULL
  AND location IS NOT NULL
  AND location NOT LIKE '%->%'
  AND location LIKE '%,%';

-- Single token (already country-only)
UPDATE public.cached_listings
SET country = trim(location)
WHERE country IS NULL
  AND location IS NOT NULL
  AND location NOT LIKE '%->%'
  AND location NOT LIKE '%,%'
  AND length(trim(location)) BETWEEN 2 AND 80;

UPDATE public.cached_listings
SET country = trim(country)
WHERE country IS NOT NULL;

-- Common aliases → canonical English names
UPDATE public.cached_listings
SET country = 'United States'
WHERE lower(country) IN ('usa', 'us', 'u.s', 'u.s.', 'america', 'united states of america');

UPDATE public.cached_listings
SET country = 'United Kingdom'
WHERE lower(country) IN ('uk', 'u.k', 'u.k.', 'great britain', 'britain', 'england', 'scotland', 'wales');

UPDATE public.cached_listings
SET country = 'Netherlands'
WHERE lower(country) IN ('holland', 'the netherlands');

UPDATE public.cached_listings
SET country = 'Czechia'
WHERE lower(country) IN ('czech republic', 'czech rep');

UPDATE public.cached_listings
SET country = 'United Arab Emirates'
WHERE lower(country) IN ('uae');

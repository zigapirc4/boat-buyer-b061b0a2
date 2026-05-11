-- Align specs_raw.segment with cached_listings.segment (segment was only on the column for many rows).
UPDATE public.cached_listings
SET specs_raw = jsonb_set(
  COALESCE(specs_raw, '{}'::jsonb),
  '{segment}',
  to_jsonb(segment),
  true
)
WHERE segment IS NOT NULL
  AND btrim(segment) <> ''
  AND (
    specs_raw IS NULL
    OR specs_raw->>'segment' IS DISTINCT FROM segment
  );

UPDATE public.cached_listings
SET specs_raw = jsonb_set(
  COALESCE(specs_raw, '{}'::jsonb),
  '{boat_type}',
  to_jsonb(boat_type),
  true
)
WHERE boat_type IS NOT NULL
  AND (
    specs_raw IS NULL
    OR specs_raw->>'boat_type' IS DISTINCT FROM boat_type::text
  );

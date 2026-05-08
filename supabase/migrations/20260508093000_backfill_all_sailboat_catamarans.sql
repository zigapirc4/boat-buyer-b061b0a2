-- Stronger one-time backfill for sailboat catamarans.
-- Uses explicit catamaran terms + common catamaran brands/model lines.

WITH candidates AS (
  SELECT
    id
  FROM public.cached_listings
  WHERE
    boat_type = 'sailboat'
    AND (
      lower(coalesce(title, '')) ~ '\m(catamaran|catamarano|catamaranes|catamarano)\M'
      OR lower(coalesce(model, '')) ~ '\m(catamaran|catamarano|catamaranes|catamarano)\M'
      OR lower(coalesce(url, '')) ~ '\m(catamaran|catamarano|catamaranes|catamarano)\M'
      OR lower(coalesce(description, '')) ~ '\m(catamaran|catamarano|catamaranes|catamarano)\M'
      OR lower(coalesce(specs_raw::text, '')) ~ '\m(catamaran|catamarano|catamaranes|catamarano)\M'

      -- Common sail catamaran builders / model lines
      OR lower(coalesce(title, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(model, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(url, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(description, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(specs_raw::text, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
    )
)
UPDATE public.cached_listings c
SET
  segment = 'catamaran',
  specs_raw = jsonb_set(
    coalesce(c.specs_raw, '{}'::jsonb),
    '{segment}',
    to_jsonb('catamaran'::text),
    true
  )
FROM candidates s
WHERE c.id = s.id;

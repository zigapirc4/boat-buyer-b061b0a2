-- Correct overly broad catamaran marking from previous backfill.
-- Keep catamaran only for strong signals; downgrade other sailboats to cruiser.

WITH strict_catamaran AS (
  SELECT id
  FROM public.cached_listings
  WHERE
    boat_type = 'sailboat'
    AND (
      lower(coalesce(title, '')) ~ '\m(catamaran|catamarano|catamaranes|multihull|multi-hull)\M'
      OR lower(coalesce(model, '')) ~ '\m(catamaran|catamarano|catamaranes|multihull|multi-hull)\M'
      OR lower(coalesce(url, '')) ~ '\m(catamaran|catamarano|catamaranes|multihull|multi-hull)\M'
      OR lower(coalesce(description, '')) ~ '\m(catamaran|catamarano|catamaranes|multihull|multi-hull)\M'
      OR lower(coalesce(specs_raw::text, '')) ~ '\m(catamaran|catamarano|catamaranes|multihull|multi-hull)\M'
      OR lower(coalesce(title, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(model, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(url, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(description, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
      OR lower(coalesce(specs_raw::text, '')) ~ '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'
    )
),
to_downgrade AS (
  SELECT c.id
  FROM public.cached_listings c
  LEFT JOIN strict_catamaran s ON s.id = c.id
  WHERE c.boat_type = 'sailboat' AND c.segment = 'catamaran' AND s.id IS NULL
)
UPDATE public.cached_listings c
SET
  segment = 'cruiser',
  specs_raw = jsonb_set(
    coalesce(c.specs_raw, '{}'::jsonb),
    '{segment}',
    to_jsonb('cruiser'::text),
    true
  )
FROM to_downgrade d
WHERE c.id = d.id;

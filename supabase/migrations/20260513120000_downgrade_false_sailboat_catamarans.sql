-- Downgrade sailboats with segment=catamaran when there is no real multihull evidence.
-- Previous strict migrations used specs_raw::text for keywords, which also matches the
-- stored JSON key "segment":"catamaran" and incorrectly *kept* false positives.
-- Aligns with scrape-free: title, model, brand, url, description + selected spec fields only.

WITH multihull_rx AS (
  SELECT '\m(catamaran|catamarano|catamaranes|multihull|multi-hull|trimaran|twin hulls?)\M'::text AS rx
),
brand_rx AS (
  SELECT
    '\m(lagoon|fountaine[ -]?pajot|leopard|nautitech|excess|catana|bali|outremer|sunreef|seawind|privilege|gemini)\M'::text AS rx
),
spec_blob AS (
  SELECT
    c.id,
    lower(
      trim(
        concat_ws(
          ' ',
          coalesce(c.specs_raw ->> 'type', ''),
          coalesce(c.specs_raw ->> 'hull', ''),
          coalesce(c.specs_raw ->> 'hull type', ''),
          coalesce(c.specs_raw ->> 'boat type', ''),
          coalesce(c.specs_raw ->> 'boattype', ''),
          coalesce(c.specs_raw ->> 'category', ''),
          coalesce(c.specs_raw ->> 'class', ''),
          coalesce(c.specs_raw ->> 'rig', ''),
          coalesce(c.specs_raw ->> 'design', ''),
          coalesce(c.specs_raw ->> 'listing_details', '')
        )
      )
    ) AS blob
  FROM public.cached_listings c
  WHERE c.boat_type = 'sailboat' AND c.segment = 'catamaran'
),
strict_catamaran AS (
  SELECT c.id
  FROM public.cached_listings c
  CROSS JOIN multihull_rx mh
  CROSS JOIN brand_rx br
  JOIN spec_blob sb ON sb.id = c.id
  WHERE
    c.boat_type = 'sailboat'
    AND (
      lower(coalesce(c.title, '')) ~ mh.rx
      OR lower(coalesce(c.model, '')) ~ mh.rx
      OR lower(coalesce(c.brand, '')) ~ mh.rx
      OR lower(coalesce(c.url, '')) ~ mh.rx
      OR lower(coalesce(c.description, '')) ~ mh.rx
      OR sb.blob ~ mh.rx
      OR lower(coalesce(c.title, '')) ~ br.rx
      OR lower(coalesce(c.model, '')) ~ br.rx
      OR lower(coalesce(c.brand, '')) ~ br.rx
      OR lower(coalesce(c.url, '')) ~ br.rx
      OR lower(coalesce(c.description, '')) ~ br.rx
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
  specs_raw = CASE
    WHEN coalesce(c.specs_raw, '{}'::jsonb) ? 'ai_details'
      THEN jsonb_set(
        jsonb_set(
          coalesce(c.specs_raw, '{}'::jsonb),
          '{segment}',
          to_jsonb('cruiser'::text),
          true
        ),
        '{ai_details,segment}',
        to_jsonb('cruiser'::text),
        true
      )
    ELSE jsonb_set(
      coalesce(c.specs_raw, '{}'::jsonb),
      '{segment}',
      to_jsonb('cruiser'::text),
      true
    )
  END
FROM to_downgrade d
WHERE c.id = d.id;

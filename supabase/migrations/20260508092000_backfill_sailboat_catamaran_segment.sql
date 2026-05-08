-- Backfill sailboat catamarans in cached_listings.
-- Marks segment as 'catamaran' when clear catamaran signals are present.

UPDATE public.cached_listings
SET
  segment = 'catamaran',
  specs_raw = jsonb_set(
    COALESCE(specs_raw, '{}'::jsonb),
    '{segment}',
    to_jsonb('catamaran'::text),
    true
  )
WHERE
  boat_type = 'sailboat'
  AND (
    lower(COALESCE(title, '')) ~ '\\m(catamaran|catamaran|catamarano|cat)\\M'
    OR lower(COALESCE(model, '')) ~ '\\m(catamaran|catamaran|catamarano|cat)\\M'
    OR lower(COALESCE(url, '')) ~ '\\m(catamaran|catamaran|catamarano|cat)\\M'
    OR lower(COALESCE(description, '')) ~ '\\m(catamaran|catamaran|catamarano|cat)\\M'
    OR lower(COALESCE(specs_raw::text, '')) ~ '\\m(catamaran|catamaran|catamarano|cat)\\M'
  );

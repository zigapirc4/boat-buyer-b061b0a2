-- Remove malformed parsed marina price row (development import attempt).
DELETE FROM public.marinas
WHERE name = 'Marina Martinis Marchi'
  AND price_per_meter_year <= 100;

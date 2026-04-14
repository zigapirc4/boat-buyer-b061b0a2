
ALTER TABLE public.marinas
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS berth_types text[],
  ADD COLUMN IF NOT EXISTS boat_length_range text,
  ADD COLUMN IF NOT EXISTS last_updated text;


CREATE TABLE public.marinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  region text,
  price_per_meter_year numeric,
  currency text DEFAULT 'EUR',
  website text,
  notes text,
  source text,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marinas"
  ON public.marinas FOR SELECT
  TO public
  USING (true);

CREATE INDEX idx_marinas_country ON public.marinas(country);

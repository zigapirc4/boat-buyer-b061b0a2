-- Track rotating offset across cron runs
CREATE TABLE IF NOT EXISTS public.scrape_cron_state (
  id INT PRIMARY KEY DEFAULT 1,
  next_start_idx INT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.scrape_cron_state (id, next_start_idx)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.scrape_cron_state ENABLE ROW LEVEL SECURITY;

-- No public access; only service role / cron uses it
CREATE POLICY "No public access to scrape_cron_state"
ON public.scrape_cron_state
FOR SELECT
USING (false);

-- Remove any prior schedule with same name
DO $$
BEGIN
  PERFORM cron.unschedule('scrape-listings-every-10min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule scraper every 10 minutes, rotating through queries 60 at a time
SELECT cron.schedule(
  'scrape-listings-every-10min',
  '*/10 * * * *',
  $cron$
  WITH s AS (
    UPDATE public.scrape_cron_state
       SET next_start_idx = (next_start_idx + 60) % 714,
           last_run_at = now()
     WHERE id = 1
     RETURNING (next_start_idx - 60 + 714) % 714 AS start_idx
  )
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-listings-cron',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := jsonb_build_object('startIdx', s.start_idx, 'endIdx', s.start_idx + 60, 'enrichCount', 40)
  ) FROM s;
  $cron$
);
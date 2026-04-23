
-- 1. Remove old subito.it listings (source no longer scraped)
DELETE FROM public.cached_listings WHERE source = 'subito.it';

-- 2. Drop existing scrape-free cron jobs (we are restructuring batches & cadence)
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'scrape-free-batch-a',
      'scrape-free-batch-b',
      'scrape-free-batch-c',
      'scrape-free-batch-d'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- 3. Reschedule with 4 batches, each every 15 minutes, staggered every ~3-4 minutes.
-- Category indices in scrape-free CATEGORY_PAGES:
--   0,1 = mornar.net (sail, power)
--   2,3 = trovobarche.it (sail, power)
--   4,5 = boat24.com (sail, power)

-- Batch A: mornar (0..2) at minute 0,15,30,45
SELECT cron.schedule(
  'scrape-free-batch-a',
  '0,15,30,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

-- Batch B: trovobarche sailboats (2..3) at minute 3,18,33,48
SELECT cron.schedule(
  'scrape-free-batch-b',
  '3,18,33,48 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":3,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

-- Batch C: trovobarche powerboats (3..4) at minute 6,21,36,51
SELECT cron.schedule(
  'scrape-free-batch-c',
  '6,21,36,51 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":3,"categoryEnd":4,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

-- Batch D: boat24 (4..6) at minute 9,24,39,54
SELECT cron.schedule(
  'scrape-free-batch-d',
  '9,24,39,54 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

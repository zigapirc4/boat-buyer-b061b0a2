
-- Remove all old Firecrawl-based scraper cron jobs
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'scrape-listings-twice-daily',
      'scrape-listings-cron',
      'scrape-listings-batch-a',
      'scrape-listings-batch-b',
      'scrape-marinas',
      'enrich-listings',
      'enrich-listings-cron'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- Ensure the token-free scraper jobs exist (idempotent: drop then recreate)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-free-batch-a') THEN
    PERFORM cron.unschedule('scrape-free-batch-a');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-free-batch-b') THEN
    PERFORM cron.unschedule('scrape-free-batch-b');
  END IF;
END $$;

-- Batch A: mornar (sail+power) + subito  -> categories 0..3
SELECT cron.schedule(
  'scrape-free-batch-a',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":3,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

-- Batch B: boat24 (sail+power) -> categories 3..5, offset 10 minutes
SELECT cron.schedule(
  'scrape-free-batch-b',
  '10 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnxxccyyvjvfqgigtmbo.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHhjY3l5dmp2ZnFnaWd0bWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTA2ODgsImV4cCI6MjA5MTcyNjY4OH0.UctgZZ3cUnQj5UVBpreVhLYNfGk6Z-_WRAABkDS5_gI"}'::jsonb,
    body := '{"categoryStart":3,"categoryEnd":5,"maxListingsPerPage":8}'::jsonb
  ) AS request_id;
  $$
);

-- Retroactive cleanup: for existing mornar.net listings, if image_url is the same as
-- the first entry of image_urls AND there are multiple images, drop it (it's the logo).
UPDATE public.cached_listings
SET
  image_url = image_urls[2],
  image_urls = image_urls[2:]
WHERE source = 'mornar.net'
  AND image_urls IS NOT NULL
  AND array_length(image_urls, 1) > 1
  AND image_url = image_urls[1]
  AND (
    image_url ILIKE '%logo%'
    OR image_url ILIKE '%header%'
    OR image_url ILIKE '%banner%'
    OR image_url ILIKE '%mornar%logo%'
  );

-- For mornar listings with a single image that looks like a logo, null it out so it gets rescraped
UPDATE public.cached_listings
SET image_url = NULL, image_urls = NULL
WHERE source = 'mornar.net'
  AND image_url IS NOT NULL
  AND (image_url ILIKE '%logo%' OR image_url ILIKE '%/header%' OR image_url ILIKE '%banner%');

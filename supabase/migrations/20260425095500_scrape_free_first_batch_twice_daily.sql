-- Run only the free scraper twice daily, limited to the first batch of pages.
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      -- legacy Firecrawl jobs
      'scrape-listings-twice-daily',
      'scrape-listings-cron',
      'scrape-listings-batch-a',
      'scrape-listings-batch-b',
      -- older scrape-free batches
      'scrape-free-batch-a',
      'scrape-free-batch-b',
      'scrape-free-batch-c',
      'scrape-free-batch-d',
      -- tiered scrape-free jobs
      'scrape-free-mornar-hot',
      'scrape-free-mornar-warm',
      'scrape-free-trovo-hot',
      'scrape-free-trovo-warm',
      'scrape-free-trovo-cold',
      'scrape-free-boat24-hot',
      'scrape-free-boat24-warm',
      'scrape-free-boat24-cold',
      -- this migration job name (idempotent re-run)
      'scrape-free-first-batch-twice-daily'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'scrape-free-first-batch-twice-daily',
  '0 2,14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":6,"pageStart":1,"pageEnd":10,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

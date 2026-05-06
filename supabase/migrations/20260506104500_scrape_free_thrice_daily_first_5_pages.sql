-- Scrape-free schedule policy:
-- - run 3x daily
-- - only first 5 pages
-- - across all configured category/type pairs

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname
    FROM cron.job
    WHERE
      -- remove any previous scrape-free schedules
      jobname LIKE 'scrape-free-%'
      OR jobname IN (
        'scrape-listings-twice-daily',
        'scrape-listings-cron',
        'scrape-listings-batch-a',
        'scrape-listings-batch-b'
      )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'scrape-free-thrice-daily-first-5-pages',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":12,"pageStart":1,"pageEnd":5,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

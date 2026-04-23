-- Expand boat24 scrape coverage to 30 pages with a cold tier for pages 21..30.

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'scrape-free-boat24-hot',
      'scrape-free-boat24-warm',
      'scrape-free-boat24-cold'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- HOT: pages 1..10 every 15 min (offset minute 9)
SELECT cron.schedule(
  'scrape-free-boat24-hot',
  '9,24,39,54 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":1,"pageEnd":10,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- WARM: pages 11..20 hourly (offset minute 41)
SELECT cron.schedule(
  'scrape-free-boat24-warm',
  '41 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":11,"pageEnd":20,"maxListingsPerPage":10,"listingConcurrency":4,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- COLD: pages 21..30 twice daily (03:41, 15:41 UTC)
SELECT cron.schedule(
  'scrape-free-boat24-cold',
  '41 3,15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":21,"pageEnd":30,"maxListingsPerPage":8,"listingConcurrency":3,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

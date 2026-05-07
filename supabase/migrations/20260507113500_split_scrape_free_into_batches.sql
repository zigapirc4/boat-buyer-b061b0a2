-- Reduce timeout pressure by splitting scrape-free into 3 smaller batch jobs.
-- Keeps same cadence (3x daily) and page policy, including YachtWorld page 10 override.

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname
    FROM cron.job
    WHERE jobname IN (
      'scrape-free-thrice-daily-first-5-pages',
      'scrape-free-thrice-daily-batch-a',
      'scrape-free-thrice-daily-batch-b',
      'scrape-free-thrice-daily-batch-c'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- Batch A: categories 0..4
SELECT cron.schedule(
  'scrape-free-thrice-daily-batch-a',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":5,"pageStart":1,"pageEnd":5,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- Batch B: categories 5..9 (includes YachtWorld sail/power)
SELECT cron.schedule(
  'scrape-free-thrice-daily-batch-b',
  '20 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":5,"categoryEnd":10,"pageStart":1,"pageEnd":5,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- Batch C: categories 10..13
SELECT cron.schedule(
  'scrape-free-thrice-daily-batch-c',
  '40 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":14,"pageStart":1,"pageEnd":5,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

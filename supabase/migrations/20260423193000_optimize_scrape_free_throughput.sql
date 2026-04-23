-- Tune scrape-free cron payloads for higher throughput with controlled concurrency and retries.
-- The function now supports:
-- - listingConcurrency
-- - pageConcurrency
-- - fetchRetries
-- - upsertRetries
-- - maxListingsPerPage

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

-- Batch A: mornar (0..2) at minute 0,15,30,45
SELECT cron.schedule(
  'scrape-free-batch-a',
  '0,15,30,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- Batch B: trovobarche sailboats (2..3) at minute 3,18,33,48
SELECT cron.schedule(
  'scrape-free-batch-b',
  '3,18,33,48 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":3,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- Batch C: trovobarche powerboats (3..4) at minute 6,21,36,51
SELECT cron.schedule(
  'scrape-free-batch-c',
  '6,21,36,51 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":3,"categoryEnd":4,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- Batch D: boat24 (4..6) at minute 9,24,39,54
SELECT cron.schedule(
  'scrape-free-batch-d',
  '9,24,39,54 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

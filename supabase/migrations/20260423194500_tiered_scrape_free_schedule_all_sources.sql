-- Tiered scrape schedule for all sources:
-- - HOT pages: newest listings, frequent refresh
-- - WARM pages: medium-age listings, hourly refresh
-- - COLD pages: old listings, low-frequency refresh
--
-- CATEGORY_PAGES indices in scrape-free:
--   0,1 = mornar.net (sail, power) pages 1..8
--   2,3 = trovobarche.it (sail, power) pages 1..30
--   4,5 = boat24.com (sail, power) pages 1..20

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      -- previous generic batches
      'scrape-free-batch-a',
      'scrape-free-batch-b',
      'scrape-free-batch-c',
      'scrape-free-batch-d',
      -- new tiered jobs (safe re-run)
      'scrape-free-mornar-hot',
      'scrape-free-mornar-warm',
      'scrape-free-trovo-hot',
      'scrape-free-trovo-warm',
      'scrape-free-trovo-cold',
      'scrape-free-boat24-hot',
      'scrape-free-boat24-warm'
    )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- =========================
-- MORNAR (0..2, pages 1..8)
-- =========================

-- HOT: pages 1..4 every 15 min
SELECT cron.schedule(
  'scrape-free-mornar-hot',
  '0,15,30,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"pageStart":1,"pageEnd":4,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- WARM: pages 5..8 hourly (offset minute 7)
SELECT cron.schedule(
  'scrape-free-mornar-warm',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"pageStart":5,"pageEnd":8,"maxListingsPerPage":10,"listingConcurrency":4,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- ===============================
-- TROVOBARCHE (2..4, pages 1..30)
-- ===============================

-- HOT: pages 1..10 every 15 min (offset minute 3)
SELECT cron.schedule(
  'scrape-free-trovo-hot',
  '3,18,33,48 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":1,"pageEnd":10,"maxListingsPerPage":12,"listingConcurrency":5,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- WARM: pages 11..20 hourly (offset minute 22)
SELECT cron.schedule(
  'scrape-free-trovo-warm',
  '22 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":11,"pageEnd":20,"maxListingsPerPage":10,"listingConcurrency":4,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- COLD: pages 21..30 twice daily (02:37, 14:37 UTC)
SELECT cron.schedule(
  'scrape-free-trovo-cold',
  '37 2,14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":21,"pageEnd":30,"maxListingsPerPage":8,"listingConcurrency":3,"pageConcurrency":2,"fetchRetries":2,"upsertRetries":2}'::jsonb
  ) AS request_id;
  $$
);

-- ===========================
-- BOAT24 (4..6, pages 1..20)
-- ===========================

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

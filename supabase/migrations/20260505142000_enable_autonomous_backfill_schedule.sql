-- Autonomous scrape-free backfill schedule.
-- Goal: aggressively fill historical listings while staying below gateway timeouts.
-- Jobs are split by source-pair and page tiers (hot/warm/cold).

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname
    FROM cron.job
    WHERE jobname LIKE 'scrape-free-auto-backfill-%'
       OR jobname IN (
         -- legacy jobs we no longer want active during autonomous backfill mode
         'scrape-free-first-batch-twice-daily',
         'scrape-free-mornar-hot',
         'scrape-free-mornar-warm',
         'scrape-free-trovo-hot',
         'scrape-free-trovo-warm',
         'scrape-free-trovo-cold',
         'scrape-free-boat24-hot',
         'scrape-free-boat24-warm',
         'scrape-free-boat24-cold'
       )
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- ---------- MORNAR (0..2, pages 1..8) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-mornar-hot',
  '1,16,31,46 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"pageStart":1,"pageEnd":4,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-mornar-cold',
  '11,41 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":2,"pageStart":5,"pageEnd":8,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ---------- TROVOBARCHE (2..4, pages 1..30) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-trovo-hot',
  '4,19,34,49 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":1,"pageEnd":8,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-trovo-warm',
  '14,44 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":9,"pageEnd":20,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-trovo-cold',
  '27 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":2,"categoryEnd":4,"pageStart":21,"pageEnd":30,"maxListingsPerPage":8,"listingConcurrency":1,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ---------- BOAT24 (4..6, pages 1..30) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-boat24-hot',
  '7,22,37,52 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":1,"pageEnd":8,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-boat24-warm',
  '17,47 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":9,"pageEnd":20,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-boat24-cold',
  '29 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":4,"categoryEnd":6,"pageStart":21,"pageEnd":30,"maxListingsPerPage":8,"listingConcurrency":1,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ---------- SCANBOAT (6..8, pages 1..30) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-scanboat-hot',
  '10,25,40,55 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":6,"categoryEnd":8,"pageStart":1,"pageEnd":8,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-scanboat-warm',
  '20,50 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":6,"categoryEnd":8,"pageStart":9,"pageEnd":20,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-scanboat-cold',
  '31 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":6,"categoryEnd":8,"pageStart":21,"pageEnd":30,"maxListingsPerPage":8,"listingConcurrency":1,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ---------- YACHTALL (8..10, pages 1..20) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-yachtall-hot',
  '12,42 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":1,"pageEnd":8,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-yachtall-cold',
  '34 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":9,"pageEnd":20,"maxListingsPerPage":8,"listingConcurrency":1,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ---------- NAUTANO (10..12, pages 1..20) ----------
SELECT cron.schedule(
  'scrape-free-auto-backfill-nautano-hot',
  '13,43 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":12,"pageStart":1,"pageEnd":8,"maxListingsPerPage":10,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-auto-backfill-nautano-cold',
  '36 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":12,"pageStart":9,"pageEnd":20,"maxListingsPerPage":8,"listingConcurrency":1,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

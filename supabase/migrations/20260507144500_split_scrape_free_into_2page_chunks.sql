-- Split scrape-free schedule into smaller 2-page chunks to reduce timeout risk.
-- Non-YachtWorld categories keep page 1..5. YachtWorld keeps page 1..10.

DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname
    FROM cron.job
    WHERE jobname LIKE 'scrape-free-thrice-daily-%'
       OR jobname = 'scrape-free-thrice-daily-first-5-pages'
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

-- ========= Non-YachtWorld groups =========
-- Group A: categories 0..4
SELECT cron.schedule(
  'scrape-free-thrice-daily-gA-p1-2',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":5,"pageStart":1,"pageEnd":2,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gA-p3-4',
  '10 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":5,"pageStart":3,"pageEnd":4,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gA-p5',
  '20 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":5,"pageStart":5,"pageEnd":5,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- Group B: categories 5..7
SELECT cron.schedule(
  'scrape-free-thrice-daily-gB-p1-2',
  '30 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":5,"categoryEnd":8,"pageStart":1,"pageEnd":2,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gB-p3-4',
  '40 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":5,"categoryEnd":8,"pageStart":3,"pageEnd":4,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gB-p5',
  '50 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":5,"categoryEnd":8,"pageStart":5,"pageEnd":5,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- Group C: categories 10..13
SELECT cron.schedule(
  'scrape-free-thrice-daily-gC-p1-2',
  '0 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":14,"pageStart":1,"pageEnd":2,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gC-p3-4',
  '10 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":14,"pageStart":3,"pageEnd":4,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-gC-p5',
  '20 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":10,"categoryEnd":14,"pageStart":5,"pageEnd":5,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

-- ========= YachtWorld only (categories 8..9), keep up to page 10 in 2-page windows =========
SELECT cron.schedule(
  'scrape-free-thrice-daily-yw-p1-2',
  '30 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":1,"pageEnd":2,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-yw-p3-4',
  '40 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":3,"pageEnd":4,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-yw-p5-6',
  '50 3,11,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":5,"pageEnd":6,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-yw-p7-8',
  '0 4,12,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":7,"pageEnd":8,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'scrape-free-thrice-daily-yw-p9-10',
  '10 4,12,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":8,"categoryEnd":10,"pageStart":9,"pageEnd":10,"yachtworldPageEnd":10,"maxListingsPerPage":20,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

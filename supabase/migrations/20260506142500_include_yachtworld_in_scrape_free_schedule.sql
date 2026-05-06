-- Include YachtWorld sail+power category feeds in regular scrape-free schedule.
-- CATEGORY_PAGES now has 14 entries (indices 0..13), so categoryEnd must be 14.

SELECT cron.unschedule('scrape-free-thrice-daily-first-5-pages');

SELECT cron.schedule(
  'scrape-free-thrice-daily-first-5-pages',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tbvgavvsgyptktkdsdww.supabase.co/functions/v1/scrape-free',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmdhdnZzZ3lwdGt0a2RzZHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDIzMTYsImV4cCI6MjA5MjUxODMxNn0.p8jgQKmQkHvBaPGHHxsZXSt9kWPr46V8df8gdYaFFHE"}'::jsonb,
    body := '{"categoryStart":0,"categoryEnd":14,"pageStart":1,"pageEnd":5,"maxListingsPerPage":12,"listingConcurrency":2,"pageConcurrency":1,"fetchRetries":2,"upsertRetries":2,"enableAiBrandModel":true}'::jsonb
  ) AS request_id;
  $$
);

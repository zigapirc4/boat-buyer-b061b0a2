-- Stop automated scraping: remove every pg_cron job that invokes scrape-free.
-- Manual import / scrape-boat-listing (same Edge Function with urls[]) still works.
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT jobname
    FROM cron.job
    WHERE command LIKE '%/functions/v1/scrape-free%'
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
END $$;

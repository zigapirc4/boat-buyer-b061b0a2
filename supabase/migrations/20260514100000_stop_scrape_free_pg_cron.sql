-- Disable all automated scrape-free runs (thrice-daily chunks, autonomous backfill, etc.).
-- Manual import / targeted scrape-free with urls[] still works.

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

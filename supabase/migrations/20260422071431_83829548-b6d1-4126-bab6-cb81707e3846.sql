
ALTER ROLE anon SET pgrst.db_max_rows = '100000';
ALTER ROLE authenticated SET pgrst.db_max_rows = '100000';
NOTIFY pgrst, 'reload config';

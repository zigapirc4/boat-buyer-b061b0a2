-- Remove temporary test marinas used during scraper development.
DELETE FROM public.marinas
WHERE website IN ('https://example.com/strong', 'https://example.com/derived')
   OR name IN ('Test Marina Strong', 'Test Marina Derived');



## Fix: Scraper not inserting new boats

### Problem
The edge function `scrape-listings-cron` logs show:
```
Upsert error: {"code":"23505","details":"Key (url)=(...) already exists.","hint":null,"message":"duplicate key value violates unique constraint \"cached_listings_url_key\""}
```

PostgREST's `Prefer: resolution=merge-duplicates` fails because it doesn't know which constraint to resolve against (table has both `id` PK and `url` unique). New listings with the same URL aren't being updated, and the upsert errors out entirely — meaning even new URLs in the same batch get dropped.

Last successful scrape: April 14. No new data since then.

### Fix (single file: `supabase/functions/scrape-listings-cron/index.ts`)

1. **Add `?on_conflict=url` to both upsert endpoints** (search mode ~line 391 and map mode ~line 323):
   - Change: `${supabaseUrl}/rest/v1/cached_listings`
   - To: `${supabaseUrl}/rest/v1/cached_listings?on_conflict=url`
   
   This tells PostgREST to use the `url` unique constraint for conflict resolution, so existing listings get updated and new ones get inserted.

2. **Upgrade Firecrawl API from v1 to v2** (lines 173, 265, 353):
   - `/v1/search` → `/v2/search`
   - `/v1/scrape` → `/v2/scrape`
   - `/v1/map` → `/v2/map`

3. **Deploy the updated edge function** and trigger a test run.

### Technical details
- Two upsert call sites: search mode (line 391) and map mode (line 323)
- Three Firecrawl API call sites: search (line 353), scrape/enrich (line 173), map (line 265)
- After deploy, will invoke the function to verify new listings appear


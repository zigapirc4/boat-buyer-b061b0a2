---
name: Scraper configuration
description: Edge function scraper with 95 targeted queries, strict listing-only URL filtering, quality data requirements
type: feature
---
- Edge function: `scrape-listings-cron`
- 95 search queries: brand+model specific (Bavaria 34, Beneteau Oceanis 38, etc.) + regional site-scoped
- SAILBOAT_QUERY_COUNT = 44 (queries 0-43)
- Strict URL filtering: rejects category/search/aggregation pages, YouTube, Facebook, etc.
- Quality gate: requires price OR (year AND length) to accept a listing
- Enrichment: Firecrawl scrape+extract on top 10 per batch (limited to avoid timeout)
- Batched invocation: `startIdx`, `endIdx`, `skipEnrich` params
- Upsert with `resolution=merge-duplicates` on `url` unique constraint

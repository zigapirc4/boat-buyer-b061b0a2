---
name: Scraper configuration
description: Token-free scraper covering mornar.net, trovobarche.it, boat24.com — 4 batches running every 15 min staggered
type: feature
---
- Edge function: `scrape-free` (token-free, direct fetch + r.jina.ai fallback)
- Sources: mornar.net (sail+power), trovobarche.it (sail+power, replaces subito.it), boat24.com (sail+power)
- CATEGORY_PAGES indices: 0,1=mornar; 2,3=trovobarche (sail=202, power=203, 30 pages each); 4,5=boat24
- trovobarche listing URL pattern: `/en/<slug>-classified-<id>`
- Pagination: trovobarche `?o=date-d&page=N`
- Quality gate: requires price OR (year AND length) to accept a listing
- Cron: 4 batches (a/b/c/d) every 15 min, offset 0/3/6/9 min — effective scrape every ~3-4 min
- Body: `{categoryStart, categoryEnd, maxListingsPerPage:8}`

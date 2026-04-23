---
name: Scraper configuration
description: Token-free scraper covering mornar.net, trovobarche.it, boat24.com — site-specific extractors for description + equipment, 4 batches every 15 min staggered
type: feature
---
- Edge function: `scrape-free` (token-free, direct fetch + r.jina.ai fallback)
- Sources: mornar.net (sail+power), trovobarche.it (sail+power), boat24.com (sail+power)
- CATEGORY_PAGES indices: 0,1=mornar; 2,3=trovobarche (sail=202, power=203, 30 pages each); 4,5=boat24
- trovobarche listing URL pattern: `/en/<slug>-classified-<id>`
- Pagination: trovobarche `?o=date-d&page=N`
- Quality gate: requires price OR (year AND length) to accept a listing
- Cron: 4 batches (a/b/c/d) every 15 min, offset 0/3/6/9 min — effective scrape every ~3-4 min
- Body: `{categoryStart, categoryEnd, maxListingsPerPage:8}`
- Site-specific extractors in `parseListing` for rich description + equipment text[]:
  - boat24.com: description from JSON-LD Vehicle.description; equipment from `id="equipment"` <ul><li> block
  - trovobarche.it: description from `cls-description` `.translator-content` (teaser only — full text JS-rendered); equipment from "Optionals and equipment" <ul><li> block
  - mornar.net: longest meaningful <div>/<p>/<td> block as description; equipment via "Equipment/Inventory/Oprema" + nearest <ul>/<table>
- DB: `cached_listings.equipment text[]` column added 2026-04-23

# Project Memory

## Core
BoatBuyer app — boat listing aggregator with evaluate, ownership cost, and AI chatbot.
355+ quality listings from boat24, yachtworld, scanboat, boats.com, mornar.net, subito.it, etc.
Scraper uses Firecrawl search API with strict individual-listing URL filtering.
User is in Slovenia (Ljubljana). Nearby listings (Croatia, Italy, Greece) should rank first.

## Memories
- [DB schema](mem://features/db-schema) — cached_listings and marinas tables, public read RLS
- [Scraper](mem://features/scraper) — 95 targeted queries, strict listing URL filtering, quality data gate

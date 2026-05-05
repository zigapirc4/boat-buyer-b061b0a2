alter table public.cached_listings
add column if not exists segment text;

create index if not exists idx_cached_listings_segment on public.cached_listings(segment);

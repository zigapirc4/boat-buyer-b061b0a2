insert into public.marinas (
  name,
  country,
  region,
  website,
  source,
  price_per_meter_year,
  currency,
  confidence_score,
  notes,
  last_updated,
  scraped_at
)
select
  'Marina Izola',
  'Slovenia',
  'Slovenian Coast',
  'https://www.marinaizola.si/',
  'si-it-seed-v1',
  640,
  'EUR',
  0.40,
  'Estimated benchmark rate; verify official tariff.',
  now(),
  now()
where not exists (
  select 1 from public.marinas where website = 'https://www.marinaizola.si/'
);

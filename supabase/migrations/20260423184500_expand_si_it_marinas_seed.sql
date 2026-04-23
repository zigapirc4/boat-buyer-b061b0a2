-- Expand Slovenia and Italy marina coverage.
-- Prices are indicative yearly EUR per meter benchmarks and should be verified.
with seed(name, country, region, website, source, price_per_meter_year, currency, confidence_score, notes) as (
  values
    -- Slovenia
    ('Marina Portorož', 'Slovenia', 'Slovenian Coast', 'https://www.marinap.si/', 'si-it-seed-v1', 680, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Koper', 'Slovenia', 'Slovenian Coast', 'https://www.marinakoper.si/', 'si-it-seed-v1', 620, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),

    -- Italy (expanded set)
    ('Marina di Trieste', 'Italy', 'Friuli-Venezia Giulia', 'https://www.marinaditrieste.it/', 'si-it-seed-v1', 780, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Hannibal Monfalcone', 'Italy', 'Friuli-Venezia Giulia', 'https://www.marinahannibal.it/', 'si-it-seed-v1', 650, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Punta Faro', 'Italy', 'Friuli-Venezia Giulia', 'https://www.puntafaro.com/', 'si-it-seed-v1', 720, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Santelena', 'Italy', 'Veneto', 'https://www.marinasantelena.com/', 'si-it-seed-v1', 920, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Venezia Certosa Marina', 'Italy', 'Veneto', 'https://www.venezia-certosa-marina.it/', 'si-it-seed-v1', 860, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Darsena Le Saline Chioggia', 'Italy', 'Veneto', 'https://www.darsenalesaline.it/', 'si-it-seed-v1', 620, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Ravenna', 'Italy', 'Emilia-Romagna', 'https://www.marinadiravenna.it/', 'si-it-seed-v1', 600, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Rimini', 'Italy', 'Emilia-Romagna', 'https://www.marinadirimini.com/', 'si-it-seed-v1', 700, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Cala de Medici', 'Italy', 'Tuscany', 'https://www.calademedici.it/', 'si-it-seed-v1', 980, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Porto di Pisa', 'Italy', 'Tuscany', 'https://www.portodipisa.it/', 'si-it-seed-v1', 940, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Scarlino', 'Italy', 'Tuscany', 'https://www.marinadiscarlino.it/', 'si-it-seed-v1', 900, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di San Vincenzo', 'Italy', 'Tuscany', 'https://www.marinadisanvincenzo.it/', 'si-it-seed-v1', 840, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Punta Ala', 'Italy', 'Tuscany', 'https://www.marinadipuntaala.it/', 'si-it-seed-v1', 1020, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Porto Ercole', 'Italy', 'Tuscany', 'https://www.marinadiportoercole.it/', 'si-it-seed-v1', 980, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Nettuno', 'Italy', 'Lazio', 'https://www.marinadinettuno.it/', 'si-it-seed-v1', 760, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Riva di Traiano', 'Italy', 'Lazio', 'https://www.rivaditraiano.com/', 'si-it-seed-v1', 800, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Porto Turistico di Roma', 'Italy', 'Lazio', 'https://www.portoturisticodiroma.it/', 'si-it-seed-v1', 820, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina d''Arechi', 'Italy', 'Campania', 'https://www.marinadarechi.com/', 'si-it-seed-v1', 720, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Stabia', 'Italy', 'Campania', 'https://www.marinadistabia.it/', 'si-it-seed-v1', 760, 'EUR', 0.40, 'Estimated benchmark rate; verify official tariff.'),
    ('Porto Turistico Capri', 'Italy', 'Campania', 'https://www.portoturisticocapri.com/', 'si-it-seed-v1', 1150, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Portisco', 'Italy', 'Sardinia', 'https://www.marinadiportisco.it/', 'si-it-seed-v1', 1100, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Olbia', 'Italy', 'Sardinia', 'https://www.marinadiolbia.it/', 'si-it-seed-v1', 860, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Alghero', 'Italy', 'Sardinia', 'https://www.marinadialghero.it/', 'si-it-seed-v1', 780, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Cagliari', 'Italy', 'Sardinia', 'https://www.marinadicagliari.it/', 'si-it-seed-v1', 760, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Palermo', 'Italy', 'Sicily', 'https://www.marinadipalermo.it/', 'si-it-seed-v1', 700, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Ragusa', 'Italy', 'Sicily', 'https://www.marinadiragusa.it/', 'si-it-seed-v1', 740, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina di Riposto', 'Italy', 'Sicily', 'https://www.portodelletna.com/', 'si-it-seed-v1', 680, 'EUR', 0.35, 'Estimated benchmark rate; verify official tariff.')
)
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
  s.name,
  s.country,
  s.region,
  s.website,
  s.source,
  s.price_per_meter_year,
  s.currency,
  s.confidence_score,
  s.notes,
  now(),
  now()
from seed s
where not exists (
  select 1
  from public.marinas m
  where m.website = s.website
);

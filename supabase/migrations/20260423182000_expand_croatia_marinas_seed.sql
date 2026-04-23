-- Expand Croatian marina coverage with practical benchmark entries.
-- Prices are indicative yearly EUR per meter benchmarks and should be verified with each marina.
with seed(name, country, region, website, source, price_per_meter_year, currency, confidence_score, notes) as (
  values
    ('ACI Marina Umag', 'Croatia', 'Istria', 'https://aci-marinas.com/marina/aci-marina-umag/', 'croatia-seed-v1', 620, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Rovinj', 'Croatia', 'Istria', 'https://aci-marinas.com/marina/aci-marina-rovinj/', 'croatia-seed-v1', 760, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Pula', 'Croatia', 'Istria', 'https://aci-marinas.com/marina/aci-marina-pula/', 'croatia-seed-v1', 640, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Opatija', 'Croatia', 'Kvarner', 'https://aci-marinas.com/marina/aci-marina-opatija/', 'croatia-seed-v1', 700, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Cres', 'Croatia', 'Kvarner', 'https://aci-marinas.com/marina/aci-marina-cres/', 'croatia-seed-v1', 610, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Rab', 'Croatia', 'Kvarner', 'https://aci-marinas.com/marina/aci-marina-rab/', 'croatia-seed-v1', 590, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Supetarska Draga', 'Croatia', 'Kvarner', 'https://aci-marinas.com/marina/aci-marina-supetarska-draga/', 'croatia-seed-v1', 560, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Šimuni', 'Croatia', 'Kvarner', 'https://aci-marinas.com/marina/aci-marina-simuni/', 'croatia-seed-v1', 580, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Piškera', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-piskera/', 'croatia-seed-v1', 650, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Žut', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-zut/', 'croatia-seed-v1', 640, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Jezera', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-jezera/', 'croatia-seed-v1', 600, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Vodice', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-vodice/', 'croatia-seed-v1', 620, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Skradin', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-skradin/', 'croatia-seed-v1', 540, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Šibenik', 'Croatia', 'Dalmatia North', 'https://aci-marinas.com/marina/aci-marina-sibenik/', 'croatia-seed-v1', 610, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Trogir', 'Croatia', 'Dalmatia Central', 'https://aci-marinas.com/marina/aci-marina-trogir/', 'croatia-seed-v1', 700, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Split', 'Croatia', 'Dalmatia Central', 'https://aci-marinas.com/marina/aci-marina-split/', 'croatia-seed-v1', 840, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Milna', 'Croatia', 'Dalmatia Central', 'https://aci-marinas.com/marina/aci-marina-milna/', 'croatia-seed-v1', 620, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Palmižana', 'Croatia', 'Dalmatia Central', 'https://aci-marinas.com/marina/aci-marina-palmizana/', 'croatia-seed-v1', 740, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Vrboska', 'Croatia', 'Dalmatia Central', 'https://aci-marinas.com/marina/aci-marina-vrboska/', 'croatia-seed-v1', 580, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Korčula', 'Croatia', 'Dalmatia South', 'https://aci-marinas.com/marina/aci-marina-korcula/', 'croatia-seed-v1', 670, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Slano', 'Croatia', 'Dalmatia South', 'https://aci-marinas.com/marina/aci-marina-slano/', 'croatia-seed-v1', 610, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('ACI Marina Dubrovnik', 'Croatia', 'Dalmatia South', 'https://aci-marinas.com/marina/aci-marina-dubrovnik/', 'croatia-seed-v1', 900, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('D-Marin Dalmacija', 'Croatia', 'Dalmatia North', 'https://www.d-marin.com/marinas/d-marin-dalmacija', 'croatia-seed-v1', 760, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('D-Marin Borik', 'Croatia', 'Dalmatia North', 'https://www.d-marin.com/marinas/d-marin-borik', 'croatia-seed-v1', 640, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('D-Marin Mandalina', 'Croatia', 'Dalmatia North', 'https://www.d-marin.com/marinas/d-marin-mandalina', 'croatia-seed-v1', 920, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Frapa Rogoznica', 'Croatia', 'Dalmatia Central', 'https://www.frapa.hr/', 'croatia-seed-v1', 840, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Baotić', 'Croatia', 'Dalmatia Central', 'https://www.marinabaotic.com/', 'croatia-seed-v1', 780, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Kremik', 'Croatia', 'Dalmatia Central', 'https://www.marina-kremik.com/', 'croatia-seed-v1', 660, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Punat', 'Croatia', 'Kvarner', 'https://www.marina-punat.hr/', 'croatia-seed-v1', 720, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.'),
    ('Marina Veruda', 'Croatia', 'Istria', 'https://www.marina-veruda.hr/', 'croatia-seed-v1', 690, 'EUR', 0.45, 'Estimated benchmark rate; verify official tariff.')
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

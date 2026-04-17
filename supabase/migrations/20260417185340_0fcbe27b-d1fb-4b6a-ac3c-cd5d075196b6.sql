-- Backfill boat_type from URL path (most reliable signal)
UPDATE public.cached_listings
SET boat_type = 'powerboat'
WHERE boat_type = 'sailboat'
  AND url ~* '/(powerboats|motorboats|motorboote|barcheamotore|motoryachts|motornaplovila|gliseri|moottoriveneet|motorbade)/';

UPDATE public.cached_listings
SET boat_type = 'sailboat'
WHERE boat_type = 'powerboat'
  AND url ~* '/(sailingboats|sailboats|segelboote|barcheavela|purjeveneet|sejlbade|jedrilice|voiliers|veleros)/';

-- Backfill from known powerboat brands in title (only when URL doesn't already say sailboat)
UPDATE public.cached_listings
SET boat_type = 'powerboat'
WHERE boat_type = 'sailboat'
  AND url !~* '/(sailingboats|sailboats|segelboote|barcheavela|purjeveneet|sejlbade|jedrilice|voiliers|veleros)/'
  AND (
    title ~* '\m(azimut|ferretti|sunseeker|fairline|cranchi|sessa|galeon|prestige|sea ray|bayliner|saxdor|axopar|nimbus|quicksilver|parker|boston whaler|pershing|absolute|sealine|invictus|fjord|pardo)\M'
    OR title ~* '(merry fisher|cap camarat|antares|swift trawler|gran turismo|monte carlo|flybridge|motor yacht|motoryacht|motorboat|powerboat|cabin cruiser|express cruiser)'
    OR title ~* '\mprincess (v|f|y|s)\d'
  );

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARINA_SOURCES = [
  { query: 'ACI marina price list annual berth fees Croatia EUR per meter 2024 2025', confidence: 1.0 },
  { query: 'site:aci-marinas.com price list berth annual', confidence: 1.0 },
  { query: 'Marina Kastela Frapa Kornati annual berth price per meter EUR Croatia', confidence: 0.8 },
  { query: 'Marina Punat Veruda Mandalina annual berth fees EUR per meter Croatia', confidence: 0.8 },
  { query: 'D-Marin Dalmacija Marina Trogir annual berth fees price list Croatia', confidence: 0.8 },
  { query: 'Marina Split Dubrovnik Palmizana Hvar annual berth price EUR Croatia', confidence: 0.8 },
  { query: 'Marina Portoroz Izola Koper annual berth price EUR per meter Slovenia', confidence: 0.8 },
  { query: 'marina Trieste Muggia annual berth fees EUR Italy Adriatic', confidence: 0.8 },
  { query: 'marina annual berth fees Greece Ionian Lefkas EUR per meter price list', confidence: 0.6 },
  { query: 'Porto Montenegro marina annual berth fees EUR per meter', confidence: 0.8 },
  { query: 'Croatia marina annual berth prices comparison EUR per meter 2024 2025', confidence: 0.6 },
  { query: 'Adriatic marina annual berth cost EUR per meter comparison list', confidence: 0.6 },
  { query: 'Mediterranean marina berth fees annual price per meter EUR comparison 2024', confidence: 0.3 },
];

interface MarinaEntry {
  name: string;
  country: string;
  region: string | null;
  price_per_meter_year: number | null;
  currency: string;
  source: string;
  website: string | null;
  scraped_at: string;
  notes: string | null;
  confidence_score: number;
  berth_types: string[] | null;
  boat_length_range: string | null;
  last_updated: string | null;
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    marinas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          country: { type: 'string' },
          region: { type: 'string' },
          price_per_meter_eur_per_year: { type: 'number' },
          currency_original: { type: 'string' },
          berth_types: { type: 'array', items: { type: 'string' } },
          boat_length_range: { type: 'string' },
          notes: { type: 'string' },
          price_year: { type: 'string' },
        },
        required: ['name', 'country'],
      },
    },
  },
};

const EXTRACTION_PROMPT = `Extract marina berth pricing data. RULES:
- Only extract prices EXPLICITLY stated. Do NOT guess or estimate.
- Convert to EUR per meter per YEAR. If HRK, divide by 7.5.
- If total annual price for a specific length, divide by the length.
- If no price clearly stated, set price_per_meter_eur_per_year to null.
- Note waiting lists, premium zones, special conditions.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const startIdx = body.startIdx ?? 0;
    const endIdx = body.endIdx ?? MARINA_SOURCES.length;
    const maxScrape = body.maxScrape ?? 8; // max URLs to deep-scrape with extract

    const batch = MARINA_SOURCES.slice(startIdx, endIdx);
    console.log(`Processing marina queries ${startIdx}-${endIdx} (${batch.length} queries)`);

    // Step 1: Collect URLs via search (no scraping - fast)
    const urlsToScrape: { url: string; confidence: number }[] = [];
    const seenUrls = new Set<string>();

    for (const source of batch) {
      try {
        console.log(`Searching: ${source.query}`);
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: source.query, limit: 5 }),
        });

        if (!searchResp.ok) {
          console.error(`Search failed (${searchResp.status})`);
          continue;
        }

        const searchData = await searchResp.json();
        for (const result of (searchData.data || [])) {
          const url = result.url;
          if (!url || seenUrls.has(url)) continue;
          // Skip non-relevant pages
          if (/youtube|facebook|reddit|tripadvisor|instagram|twitter/i.test(url)) continue;
          seenUrls.add(url);

          const isOfficial = /aci-marinas|d-marin|marinakastela|marinafrapa|marinakornati|punat|veruda|mandalina|palmizana|porto-montenegro|marinaportoroz/i.test(url);
          urlsToScrape.push({
            url,
            confidence: isOfficial ? 1.0 : source.confidence,
          });
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }

    console.log(`Found ${urlsToScrape.length} URLs, will scrape top ${maxScrape}`);

    // Step 2: Scrape top URLs with extract (parallel, limited)
    const toScrape = urlsToScrape.slice(0, maxScrape);
    const allMarinas: MarinaEntry[] = [];
    const seenKeys = new Set<string>();

    const scrapePromises = toScrape.map(async ({ url, confidence }) => {
      try {
        console.log(`Scraping: ${url}`);
        const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            formats: ['extract'],
            extract: { schema: EXTRACTION_SCHEMA, prompt: EXTRACTION_PROMPT },
          }),
        });

        if (!resp.ok) {
          console.error(`Scrape failed for ${url}: ${resp.status}`);
          return [];
        }

        const data = await resp.json();
        const extracted = data.data?.extract || data.extract;
        if (!extracted?.marinas) return [];

        const results: MarinaEntry[] = [];
        for (const m of extracted.marinas) {
          if (!m.name || !m.country) continue;

          const price = m.price_per_meter_eur_per_year;
          // Sanity: reject obviously wrong prices
          if (price !== null && price !== undefined && (price < 10 || price > 5000)) {
            console.warn(`Rejecting unrealistic price ${price} for ${m.name}`);
            continue;
          }

          results.push({
            name: m.name.trim(),
            country: m.country.trim(),
            region: m.region?.trim() || null,
            price_per_meter_year: price ?? null,
            currency: 'EUR',
            source: url,
            website: url,
            scraped_at: new Date().toISOString(),
            notes: m.notes || null,
            confidence_score: confidence,
            berth_types: m.berth_types?.length ? m.berth_types : null,
            boat_length_range: m.boat_length_range || null,
            last_updated: m.price_year || null,
          });
        }
        return results;
      } catch (e) {
        console.error(`Scrape error for ${url}:`, e);
        return [];
      }
    });

    const scrapeResults = await Promise.all(scrapePromises);
    for (const results of scrapeResults) {
      for (const marina of results) {
        const key = `${marina.name.toLowerCase()}|${marina.country.toLowerCase()}`;
        if (seenKeys.has(key)) {
          // Update if existing has no price but this one does
          const existing = allMarinas.find(
            (e) => `${e.name.toLowerCase()}|${e.country.toLowerCase()}` === key
          );
          if (existing && !existing.price_per_meter_year && marina.price_per_meter_year) {
            Object.assign(existing, marina);
          }
          continue;
        }
        seenKeys.add(key);
        allMarinas.push(marina);
      }
    }

    console.log(`Found ${allMarinas.length} unique marinas to upsert`);

    if (allMarinas.length > 0) {
      const resp = await fetch(`${supabaseUrl}/rest/v1/marinas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(allMarinas),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Upsert error:', errText);
        return new Response(JSON.stringify({ success: false, error: errText }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      count: allMarinas.length,
      marinas: allMarinas.map((m) => ({
        name: m.name, country: m.country, price: m.price_per_meter_year,
        confidence: m.confidence_score, source: m.source,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

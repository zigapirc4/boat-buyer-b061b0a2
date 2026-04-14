
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Targeted marina URLs and search queries for Croatia + nearby regions
const MARINA_SOURCES = [
  // ACI Marinas (official)
  { query: 'ACI marina price list annual berth fees Croatia 2024 2025 EUR per meter', confidence: 1.0 },
  { query: 'site:aci-marinas.com price list berth annual', confidence: 1.0 },
  // Major Croatian marinas
  { query: 'Marina Kastela annual berth price per meter EUR Croatia', confidence: 0.8 },
  { query: 'Marina Frapa Rogoznica annual berth fees price list', confidence: 0.8 },
  { query: 'Marina Kornati Biograd annual berth price EUR', confidence: 0.8 },
  { query: 'Marina Punat Krk annual berth fees EUR per meter', confidence: 0.8 },
  { query: 'Marina Veruda Pula annual berth price list', confidence: 0.8 },
  { query: 'Marina Mandalina Sibenik annual berth price EUR', confidence: 0.8 },
  { query: 'D-Marin Dalmacija annual berth fees price list', confidence: 0.8 },
  { query: 'Marina Palmizana Hvar annual berth fees', confidence: 0.8 },
  { query: 'Marina Trogir annual berth price per meter', confidence: 0.8 },
  { query: 'Marina Split ACI annual berth fees', confidence: 0.8 },
  { query: 'Marina Dubrovnik annual berth fees EUR', confidence: 0.8 },
  // Slovenian marinas
  { query: 'Marina Portoroz annual berth price EUR per meter Slovenia', confidence: 0.8 },
  { query: 'Marina Izola annual berth fees Slovenia EUR', confidence: 0.8 },
  { query: 'Marina Koper Slovenia annual berth price', confidence: 0.8 },
  // Italian marinas (Adriatic)
  { query: 'marina Trieste annual berth fees EUR per meter Italy', confidence: 0.8 },
  { query: 'marina Muggia annual berth price Italy Adriatic', confidence: 0.8 },
  // Greek marinas
  { query: 'marina annual berth fees Greece Ionian EUR per meter price list', confidence: 0.6 },
  { query: 'marina Lefkas Preveza annual berth Greece EUR price', confidence: 0.6 },
  // Montenegro
  { query: 'Porto Montenegro annual berth fees EUR per meter', confidence: 0.8 },
  { query: 'marina Bar Budva Montenegro annual berth price EUR', confidence: 0.6 },
  // General pricing comparison pages
  { query: 'Croatia marina annual berth prices comparison EUR per meter 2024 2025', confidence: 0.6 },
  { query: 'Mediterranean marina berth fees annual price per meter EUR comparison', confidence: 0.3 },
  { query: 'Adriatic marina annual berth cost per meter EUR list', confidence: 0.6 },
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
          name: { type: 'string', description: 'Official marina name' },
          country: { type: 'string', description: 'Country where the marina is located' },
          region: { type: 'string', description: 'City or region' },
          price_per_meter_eur_per_year: {
            type: 'number',
            description: 'Annual berth fee in EUR per meter per year. If price is in HRK divide by 7.5. If daily/weekly/monthly, multiply to annual. Return null if not clearly stated.',
          },
          currency_original: { type: 'string', description: 'Original currency of the price (EUR, HRK, etc.)' },
          berth_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available berth types: annual, seasonal, transit, daily',
          },
          boat_length_range: { type: 'string', description: 'Supported boat length range e.g. "8-20m"' },
          notes: { type: 'string', description: 'Important context: waiting lists, premium pricing, included services, price tiers' },
          price_year: { type: 'string', description: 'Year the price refers to, e.g. "2024" or "2025"' },
        },
        required: ['name', 'country'],
      },
    },
  },
};

const EXTRACTION_PROMPT = `Extract marina berth pricing data. RULES:
- Only extract prices that are EXPLICITLY stated on the page. Do NOT guess or estimate.
- Convert all prices to EUR per meter per YEAR. If HRK, divide by 7.5.
- If only a total annual price for a specific boat length is given, divide by the length to get per-meter price.
- If no price is clearly stated, set price_per_meter_eur_per_year to null.
- Include the marina name exactly as shown on the page.
- Note any waiting lists, premium zones, or special conditions.`;

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

    // Parse optional batch params
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const startIdx = body.startIdx ?? 0;
    const endIdx = body.endIdx ?? MARINA_SOURCES.length;

    const batch = MARINA_SOURCES.slice(startIdx, endIdx);
    console.log(`Processing marina queries ${startIdx}-${endIdx} (${batch.length} queries)`);

    const allMarinas: MarinaEntry[] = [];
    const seenKeys = new Set<string>();

    for (const source of batch) {
      try {
        console.log(`Searching: ${source.query}`);
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: source.query,
            limit: 5,
            scrapeOptions: {
              formats: [
                { type: 'json', schema: EXTRACTION_SCHEMA, prompt: EXTRACTION_PROMPT },
              ],
            },
          }),
        });

        if (!searchResp.ok) {
          console.error(`Search failed (${searchResp.status}): ${await searchResp.text()}`);
          continue;
        }

        const searchData = await searchResp.json();
        for (const result of (searchData.data || [])) {
          const json = result?.json || result?.extract;
          if (!json?.marinas) continue;

          const sourceUrl = result.url || '';
          // Determine confidence: official site = use source confidence, otherwise reduce
          let confidence = source.confidence;
          if (sourceUrl) {
            const isOfficial = /aci-marinas|d-marin|marinakastela|marinafrapa|marinakornati|punat|veruda|mandalina|palmizana|porto-montenegro/i.test(sourceUrl);
            const isBlogOrForum = /blog|forum|reddit|tripadvisor|facebook|youtube/i.test(sourceUrl);
            if (isOfficial) confidence = Math.max(confidence, 1.0);
            else if (isBlogOrForum) confidence = Math.min(confidence, 0.3);
          }

          for (const m of json.marinas) {
            if (!m.name || !m.country) continue;

            // Dedup key
            const key = `${m.name.toLowerCase().trim()}|${m.country.toLowerCase().trim()}`;
            if (seenKeys.has(key)) {
              // If we already have this marina but with no price, and this one has a price, update
              const existing = allMarinas.find(
                (e) => `${e.name.toLowerCase().trim()}|${e.country.toLowerCase().trim()}` === key
              );
              if (existing && !existing.price_per_meter_year && m.price_per_meter_eur_per_year) {
                existing.price_per_meter_year = m.price_per_meter_eur_per_year;
                existing.confidence_score = confidence;
                existing.source = sourceUrl;
                existing.notes = m.notes || existing.notes;
              }
              continue;
            }
            seenKeys.add(key);

            const price = m.price_per_meter_eur_per_year;
            // Sanity check: reject obviously wrong prices
            if (price !== null && price !== undefined) {
              if (price < 10 || price > 5000) {
                console.warn(`Rejecting unrealistic price ${price} for ${m.name}`);
                continue;
              }
            }

            allMarinas.push({
              name: m.name.trim(),
              country: m.country.trim(),
              region: m.region?.trim() || null,
              price_per_meter_year: price ?? null,
              currency: 'EUR',
              source: sourceUrl,
              website: sourceUrl || null,
              scraped_at: new Date().toISOString(),
              notes: m.notes || null,
              confidence_score: confidence,
              berth_types: m.berth_types?.length ? m.berth_types : null,
              boat_length_range: m.boat_length_range || null,
              last_updated: m.price_year || null,
            });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error('Search error for query:', source.query, e);
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
        return new Response(JSON.stringify({ success: false, error: errText, count: allMarinas.length }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      count: allMarinas.length,
      marinas: allMarinas.map((m) => ({ name: m.name, country: m.country, price: m.price_per_meter_year, confidence: m.confidence_score })),
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

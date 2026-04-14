
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const queries = [
      'marina berth prices Mediterranean annual cost per meter',
      'marina mooring fees Europe yearly rates',
      'marina prices Croatia Greece Italy Spain annual',
    ];

    const allMarinas: any[] = [];

    for (const query of queries) {
      try {
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            limit: 5,
            scrapeOptions: { formats: [{ type: 'json', schema: {
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
                      price_per_meter_year: { type: 'number' },
                      currency: { type: 'string' },
                    }
                  }
                }
              }
            }, prompt: 'Extract marina names, countries, regions, and annual berth prices per meter in EUR. If prices are monthly, multiply by 12.' }] },
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          for (const result of (searchData.data || [])) {
            const json = result?.json || result?.extract;
            if (json?.marinas) {
              for (const m of json.marinas) {
                if (m.name && m.country && m.price_per_meter_year) {
                  allMarinas.push({
                    name: m.name,
                    country: m.country,
                    region: m.region || null,
                    price_per_meter_year: m.price_per_meter_year,
                    currency: m.currency || 'EUR',
                    source: result.url || 'firecrawl',
                    scraped_at: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Search error for query:', query, e);
      }
    }

    console.log(`Found ${allMarinas.length} marinas to upsert`);

    if (allMarinas.length > 0) {
      // Upsert into marinas table
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
        console.error('Upsert error:', await resp.text());
      }
    }

    return new Response(JSON.stringify({ success: true, count: allMarinas.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

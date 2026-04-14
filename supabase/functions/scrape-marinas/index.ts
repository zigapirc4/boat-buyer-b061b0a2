
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARINA_SOURCES = [
  { query: 'ACI marina price list annual berth fees Croatia EUR per meter 2024 2025', confidence: 1.0 },
  { query: 'Marina Kastela Frapa Kornati annual berth price EUR Croatia', confidence: 0.8 },
  { query: 'Marina Punat Veruda Mandalina annual berth fees EUR Croatia', confidence: 0.8 },
  { query: 'D-Marin Dalmacija Marina Trogir Split annual berth fees Croatia', confidence: 0.8 },
  { query: 'Marina Dubrovnik Palmizana Hvar annual berth price EUR Croatia', confidence: 0.8 },
  { query: 'Marina Portoroz Izola Koper annual berth price EUR Slovenia', confidence: 0.8 },
  { query: 'marina Trieste Muggia annual berth fees EUR Italy Adriatic', confidence: 0.8 },
  { query: 'marina annual berth fees Greece Ionian Lefkas EUR per meter', confidence: 0.6 },
  { query: 'Porto Montenegro marina annual berth fees EUR per meter', confidence: 0.8 },
  { query: 'Croatia marina annual berth prices comparison EUR per meter 2024 2025', confidence: 0.6 },
  { query: 'Adriatic marina annual berth cost EUR per meter comparison', confidence: 0.6 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
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

    const batch = MARINA_SOURCES.slice(startIdx, endIdx);
    console.log(`Processing queries ${startIdx}-${endIdx} (${batch.length} queries)`);

    // Search with markdown scraping (faster than extract)
    const allContent: { markdown: string; url: string; confidence: number }[] = [];

    for (const source of batch) {
      try {
        console.log(`Searching: ${source.query}`);
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: source.query,
            limit: 3,
            scrapeOptions: { formats: ['markdown'] },
          }),
        });

        if (!searchResp.ok) {
          console.error(`Search failed (${searchResp.status}): ${await searchResp.text()}`);
          continue;
        }

        const searchData = await searchResp.json();
        for (const result of (searchData.data || [])) {
          if (!result.markdown || !result.url) continue;
          if (/youtube|facebook|reddit|instagram|twitter/i.test(result.url)) continue;
          // Truncate to save tokens for LLM
          const md = result.markdown.slice(0, 4000);
          const isOfficial = /aci-marinas|d-marin|marinakastela|marinafrapa|marinakornati|punat|veruda|mandalina|palmizana|porto-montenegro|marinaportoroz/i.test(result.url);
          allContent.push({
            markdown: md,
            url: result.url,
            confidence: isOfficial ? 1.0 : source.confidence,
          });
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }

    console.log(`Collected ${allContent.length} pages of content, sending to LLM for extraction`);

    if (allContent.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, marinas: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompt for LLM extraction
    const pagesText = allContent.map((c, i) =>
      `--- PAGE ${i + 1} (source: ${c.url}, confidence: ${c.confidence}) ---\n${c.markdown}`
    ).join('\n\n');

    const llmPrompt = `Extract marina berth pricing data from the following web pages.

RULES:
- Only extract prices EXPLICITLY stated in the text. Do NOT guess or invent prices.
- Convert all prices to EUR per meter per YEAR.
- If price is in HRK, divide by 7.5 to get EUR.
- If only a total annual price for a specific boat length is given, divide by the length to get per-meter price.
- If no price is clearly stated for a marina, set price_per_meter_eur_per_year to null.
- Include the source URL from the page header.

Return a JSON array (no markdown, no explanation) with objects like:
{
  "name": "Marina Name",
  "country": "Country",
  "region": "City/Region or null",
  "price_per_meter_eur_per_year": number or null,
  "berth_types": ["annual","seasonal","transit"] or null,
  "boat_length_range": "8-20m" or null,
  "notes": "important context" or null,
  "price_year": "2024" or null,
  "source_url": "url from page header",
  "confidence": confidence from page header
}

PAGES:
${pagesText}`;

    // Call Lovable AI Gateway
    const llmResp = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: llmPrompt }],
        temperature: 0.1,
      }),
    });

    if (!llmResp.ok) {
      const errText = await llmResp.text();
      console.error('LLM call failed:', errText);
      return new Response(JSON.stringify({ success: false, error: 'LLM extraction failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const llmData = await llmResp.json();
    const content = llmData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let marinas: any[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        marinas = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse LLM response:', e, content.slice(0, 500));
      return new Response(JSON.stringify({ success: false, error: 'Failed to parse extraction' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`LLM extracted ${marinas.length} marina entries`);

    // Deduplicate and validate
    const seenKeys = new Set<string>();
    const validMarinas: any[] = [];

    for (const m of marinas) {
      if (!m.name || !m.country) continue;
      const key = `${m.name.toLowerCase().trim()}|${m.country.toLowerCase().trim()}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const price = m.price_per_meter_eur_per_year;
      if (price !== null && price !== undefined && (price < 10 || price > 5000)) {
        console.warn(`Rejecting unrealistic price ${price} for ${m.name}`);
        continue;
      }

      validMarinas.push({
        name: m.name.trim(),
        country: m.country.trim(),
        region: m.region?.trim() || null,
        price_per_meter_year: price ?? null,
        currency: 'EUR',
        source: m.source_url || null,
        website: m.source_url || null,
        scraped_at: new Date().toISOString(),
        notes: m.notes || null,
        confidence_score: m.confidence ?? 0.5,
        berth_types: m.berth_types?.length ? m.berth_types : null,
        boat_length_range: m.boat_length_range || null,
        last_updated: m.price_year || null,
      });
    }

    console.log(`${validMarinas.length} valid marinas after dedup/validation`);

    if (validMarinas.length > 0) {
      const resp = await fetch(`${supabaseUrl}/rest/v1/marinas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(validMarinas),
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
      count: validMarinas.length,
      marinas: validMarinas.map((m: any) => ({
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

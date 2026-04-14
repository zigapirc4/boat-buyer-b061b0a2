
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEARCH_QUERIES = [
  { query: "sailboat for sale Europe price EUR site:yachtworld.com OR site:boats.com OR site:scanboat.com", boat_type: "sailboat" },
  { query: "powerboat motorboat for sale Europe price EUR site:yachtworld.com OR site:boats.com OR site:boatshop24.com", boat_type: "powerboat" },
  { query: "sailing yacht for sale Mediterranean price listing site:boat24.com OR site:sailboatlistings.com", boat_type: "sailboat" },
  { query: "motor yacht for sale Europe price listing site:boat24.com OR site:boatshop24.com", boat_type: "powerboat" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Starting hourly listing scrape...");

    // Run all searches in parallel for speed
    const searchPromises = SEARCH_QUERIES.map(async ({ query, boat_type }) => {
      try {
        console.log(`Searching: ${query}`);
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 8,
            tbs: "qdr:w",
            scrapeOptions: {
              formats: [
                {
                  type: "json",
                  schema: {
                    type: "object",
                    properties: {
                      listings: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            boat_name: { type: "string" },
                            price_eur: { type: "number" },
                            year: { type: "number" },
                            length_feet: { type: "number" },
                            location: { type: "string" },
                            image_url: { type: "string" },
                            engine_info: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  prompt: "Extract all boat listings on this page. Get boat name, price in EUR, year, length in feet, location, main image URL, and engine info.",
                },
              ],
            },
          }),
        });

        if (!searchRes.ok) {
          console.error(`Search failed for "${query}":`, await searchRes.text());
          return [];
        }

        const searchData = await searchRes.json();
        const results = searchData?.data || [];
        const listings: any[] = [];

        for (const item of results) {
          if (!item.url) continue;
          let source = "";
          try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}

          // Try to get structured extraction
          const json = item?.json || item?.extract;
          if (json?.listings && Array.isArray(json.listings)) {
            for (const l of json.listings) {
              if (!l.boat_name && !l.price_eur) continue;
              listings.push({
                title: l.boat_name || "Unknown",
                url: item.url,
                boat_type: boat_type,
                price_eur: l.price_eur || null,
                year: l.year || null,
                length_feet: l.length_feet || null,
                location: l.location || null,
                image_url: l.image_url || null,
                engine_info: l.engine_info || null,
                source,
                scraped_at: new Date().toISOString(),
              });
            }
          } else {
            // Fallback: use search result metadata
            listings.push({
              title: item.title || "Unknown",
              url: item.url,
              boat_type: boat_type,
              price_eur: null,
              year: null,
              length_feet: null,
              location: null,
              image_url: null,
              engine_info: null,
              source,
              scraped_at: new Date().toISOString(),
            });
          }
        }

        return listings;
      } catch (e) {
        console.error(`Search query failed:`, e);
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    const allListings = allResults.flat();

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueListings = allListings.filter(l => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    console.log(`Found ${uniqueListings.length} unique listings, upserting...`);

    if (uniqueListings.length > 0) {
      const resp = await fetch(`${supabaseUrl}/rest/v1/cached_listings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(uniqueListings),
      });

      if (!resp.ok) {
        console.error("Upsert error:", await resp.text());
      }
    }

    // Clean up old listings (older than 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/cached_listings?scraped_at=lt.${weekAgo}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
    });

    console.log(`Done! ${uniqueListings.length} listings stored.`);

    return new Response(JSON.stringify({ success: true, count: uniqueListings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

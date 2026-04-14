
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEARCH_QUERIES = [
  { query: "sailboat for sale Europe price EUR yachtworld OR boats.com OR scanboat", boat_type: "sailboat" },
  { query: "powerboat for sale Europe price EUR yachtworld OR boatshop24 OR boat24", boat_type: "powerboat" },
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

    // Run searches in parallel - no per-page scraping for speed
    const searchPromises = SEARCH_QUERIES.map(async ({ query, boat_type }) => {
      try {
        console.log(`Searching: ${query}`);
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: 10, tbs: "qdr:w" }),
        });

        if (!searchRes.ok) {
          console.error(`Search failed:`, await searchRes.text());
          return [];
        }

        const searchData = await searchRes.json();
        const results = searchData?.data || [];
        console.log(`Got ${results.length} results for "${query}"`);

        return results.map((item: any) => {
          let source = "";
          try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}

          // Parse price from title/description
          const text = `${item.title || ""} ${item.description || ""}`;
          const priceMatch = text.match(/(?:€|EUR)\s*([\d,.']+)/i) || text.match(/([\d,.']+)\s*(?:€|EUR)/i);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/[,.']/g, "")) : null;
          const validPrice = price && price > 1000 && price < 50000000 ? price : null;

          // Parse year
          const yearMatch = text.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1]) : null;

          // Parse length
          const lenMatch = text.match(/([\d.]+)\s*(?:ft|feet|foot)/i) || text.match(/([\d.]+)\s*m\b/i);
          const lengthFeet = lenMatch ? (text.match(/\bm\b/i) ? parseFloat(lenMatch[1]) * 3.281 : parseFloat(lenMatch[1])) : null;

          // Extract location hints
          const locMatch = text.match(/(?:in|at|located?|port|marina)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
          const location = locMatch ? locMatch[1] : null;

          return {
            title: (item.title || "Unknown").substring(0, 200),
            url: item.url,
            boat_type,
            price_eur: validPrice,
            year,
            length_feet: lengthFeet ? Math.round(lengthFeet * 10) / 10 : null,
            location,
            image_url: null,
            engine_info: null,
            source,
            scraped_at: new Date().toISOString(),
          };
        }).filter((l: any) => l.url);
      } catch (e) {
        console.error(`Search failed:`, e);
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    const allListings = allResults.flat();

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueListings = allListings.filter((l: any) => {
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
      } else {
        console.log("Upsert successful");
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

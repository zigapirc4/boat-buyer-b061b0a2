import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEARCH_QUERIES = [
  { query: "sailboat for sale Europe 2024 2025 price EUR listing", boat_type: "sailboat" },
  { query: "powerboat motorboat for sale Europe 2024 2025 price EUR listing", boat_type: "powerboat" },
  { query: "sailing yacht for sale Mediterranean price listing", boat_type: "sailboat" },
  { query: "motor yacht for sale Europe price listing", boat_type: "powerboat" },
];

serve(async (req) => {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting hourly listing scrape...");

    const allListings: any[] = [];

    // Search across multiple queries
    for (const { query, boat_type } of SEARCH_QUERIES) {
      try {
        console.log(`Searching: ${query}`);
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: 5, tbs: "qdr:w" }),
        });

        if (!searchRes.ok) {
          console.error(`Search failed for "${query}":`, await searchRes.text());
          continue;
        }

        const searchData = await searchRes.json();
        const results = searchData?.data || [];

        // Scrape each result for structured data
        for (const item of results.slice(0, 3)) {
          if (!item.url) continue;

          try {
            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: item.url,
                formats: ["extract"],
                extract: {
                  schema: {
                    type: "object",
                    properties: {
                      boat_name: { type: "string", description: "Boat model name" },
                      boat_type: { type: "string", description: "sailboat or powerboat" },
                      price_eur: { type: "number", description: "Price in EUR" },
                      year: { type: "number", description: "Year built" },
                      length_feet: { type: "number", description: "Length in feet" },
                      location: { type: "string", description: "Location (city, country)" },
                      image_url: { type: "string", description: "URL of the main boat photo" },
                      engine_info: { type: "string", description: "Brief engine info" },
                    },
                  },
                  prompt: "Extract the first/main boat listing. Get price in EUR, location, image URL, and engine info.",
                },
              }),
            });

            if (!scrapeRes.ok) continue;
            const scrapeData = await scrapeRes.json();
            const extract = scrapeData?.data?.extract || {};

            if (!extract.boat_name && !extract.price_eur) continue;

            let source = "";
            try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}

            allListings.push({
              title: extract.boat_name || item.title || "Unknown",
              url: item.url,
              boat_type: extract.boat_type || boat_type,
              price_eur: extract.price_eur || null,
              year: extract.year || null,
              length_feet: extract.length_feet || null,
              location: extract.location || null,
              image_url: extract.image_url || null,
              engine_info: extract.engine_info || null,
              source,
              scraped_at: new Date().toISOString(),
            });
          } catch (e) {
            console.error(`Failed to scrape ${item.url}:`, e);
          }
        }
      } catch (e) {
        console.error(`Search query failed:`, e);
      }
    }

    console.log(`Scraped ${allListings.length} listings, upserting to database...`);

    // Upsert listings (update if URL already exists)
    if (allListings.length > 0) {
      const { error: upsertError } = await supabase
        .from("cached_listings")
        .upsert(allListings, { onConflict: "url" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    // Clean up old listings (older than 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("cached_listings").delete().lt("scraped_at", weekAgo);

    console.log(`Done! ${allListings.length} listings stored.`);

    return new Response(JSON.stringify({ success: true, count: allListings.length }), {
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

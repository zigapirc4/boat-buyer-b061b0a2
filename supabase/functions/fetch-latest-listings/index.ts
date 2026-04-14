import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const body = await req.json().catch(() => ({}));
    const boatType = body.boat_type || "all"; // "sailboat", "powerboat", or "all"

    const queries = boatType === "all"
      ? ["sailboat for sale Europe 2024 2025 price EUR", "powerboat motorboat for sale Europe 2024 2025 price EUR"]
      : boatType === "powerboat"
        ? ["powerboat motorboat for sale Europe 2024 2025 price EUR"]
        : ["sailboat for sale Europe 2024 2025 price EUR"];

    console.log("Fetching latest listings:", queries);

    // Search across multiple queries
    const allResults: any[] = [];

    for (const query of queries) {
      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 6,
          tbs: "qdr:w", // last week
        }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData?.data || [];
        allResults.push(...results);
      }
    }

    console.log(`Got ${allResults.length} raw results, scraping top ones...`);

    // Take unique URLs
    const seen = new Set<string>();
    const unique = allResults.filter((r: any) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // Scrape top 6 for structured data
    const scrapePromises = unique.slice(0, 6).map(async (item: any) => {
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
              prompt: "Extract the first/main boat listing from this page. Get price in EUR, location, image URL, boat type (sailboat or powerboat), and engine info.",
            },
          }),
        });

        if (!scrapeRes.ok) return null;
        const scrapeData = await scrapeRes.json();
        const extract = scrapeData?.data?.extract || {};

        if (!extract.boat_name && !extract.price_eur) return null;

        return {
          title: extract.boat_name || item.title || "Unknown",
          url: item.url,
          boat_type: extract.boat_type || "sailboat",
          price_eur: extract.price_eur || null,
          year: extract.year || null,
          length_feet: extract.length_feet || null,
          location: extract.location || null,
          image_url: extract.image_url || null,
          engine_info: extract.engine_info || null,
          source: new URL(item.url).hostname.replace("www.", ""),
        };
      } catch (e) {
        console.error(`Failed to scrape ${item.url}:`, e);
        return null;
      }
    });

    const listings = (await Promise.all(scrapePromises)).filter(Boolean);
    console.log(`Returning ${listings.length} latest listings with details`);

    return new Response(JSON.stringify({ success: true, data: listings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

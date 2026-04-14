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
    const { model, length_feet, year, boat_type } = await req.json();
    if (!model) {
      return new Response(JSON.stringify({ success: false, error: "Model is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = boat_type === "powerboat" ? "powerboat motorboat" : "sailboat";
    const lengthRange = length_feet ? `${Math.round(length_feet - 4)}-${Math.round(length_feet + 4)} feet` : "";
    const yearRange = year ? `${year - 5}-${year + 5}` : "";
    
    // Search for individual listings, not aggregator pages
    const query = `"${model}" ${typeLabel} for sale ${lengthRange} ${yearRange} price listing`.trim();

    console.log("Searching for similar boats:", query);

    // Step 1: Get search results
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 8 }),
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || "Search failed" }),
        { status: searchRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawResults = searchData?.data || [];
    console.log(`Got ${rawResults.length} search results, scraping top ones for details...`);

    // Filter out aggregator/listing-index pages, prefer individual listing URLs
    const candidateUrls = rawResults
      .filter((r: any) => r.url)
      .map((r: any) => ({ url: r.url, title: r.title || "", description: r.description || "" }));

    // Step 2: Scrape top 5 individual listings for structured data
    const scrapePromises = candidateUrls.slice(0, 5).map(async (item: any) => {
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
                  price_eur: { type: "number", description: "Price in EUR. Convert from other currencies if needed." },
                  year: { type: "number", description: "Year built" },
                  length_feet: { type: "number", description: "Length in feet" },
                  location: { type: "string", description: "Where the boat is located (city, country)" },
                  image_url: { type: "string", description: "URL of the main boat photo" },
                  engine_info: { type: "string", description: "Brief engine details (make, HP, hours if available)" },
                  condition_summary: { type: "string", description: "One-sentence summary of the boat's condition" },
                },
              },
              prompt: "Extract boat listing details from this page. Get the price in EUR (convert if needed), location, the main boat image URL, and brief engine and condition info. If this is a listing index page with multiple boats, extract the first/most relevant one.",
            },
          }),
        });

        if (!scrapeRes.ok) return null;

        const scrapeData = await scrapeRes.json();
        const extract = scrapeData?.data?.extract || {};

        // Only return if we got meaningful data
        if (!extract.boat_name && !extract.price_eur) return null;

        return {
          title: extract.boat_name || item.title || "Unknown listing",
          url: item.url,
          description: extract.condition_summary || item.description || "",
          price_eur: extract.price_eur || null,
          year: extract.year || null,
          length_feet: extract.length_feet || null,
          location: extract.location || null,
          image_url: extract.image_url || null,
          engine_info: extract.engine_info || null,
        };
      } catch (e) {
        console.error(`Failed to scrape ${item.url}:`, e);
        return null;
      }
    });

    const scrapedResults = (await Promise.all(scrapePromises)).filter(Boolean);

    // Also include unscraped results as fallback (with description-parsed data)
    const scrapedUrls = new Set(scrapedResults.map((r: any) => r.url));
    const fallbackResults = candidateUrls
      .filter((item: any) => !scrapedUrls.has(item.url))
      .slice(0, 3)
      .map((item: any) => {
        // Try to parse price from description
        const priceMatch = item.description.match(/(?:€|EUR)\s?([\d,. ]+)/i);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/[,\s]/g, "").replace(/\.(?=\d{3})/g, "")) : null;
        
        return {
          title: item.title,
          url: item.url,
          description: item.description,
          price_eur: price && price > 100 ? price : null,
          year: null,
          length_feet: null,
          location: null,
          image_url: null,
          engine_info: null,
        };
      });

    const results = [...scrapedResults, ...fallbackResults].slice(0, 6);
    console.log(`Returning ${results.length} similar boats (${scrapedResults.length} with full details)`);

    return new Response(JSON.stringify({ success: true, data: results }), {
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

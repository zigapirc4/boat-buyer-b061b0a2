
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Each source has multiple search queries to maximize coverage
const SOURCES = [
  // Boat24 - major European marketplace
  { site: "boat24.com", queries: [
    "site:boat24.com sailboat for sale",
    "site:boat24.com powerboat for sale",
    "site:boat24.com motor yacht for sale",
    "site:boat24.com sailing yacht for sale",
    "site:boat24.com catamaran for sale",
  ]},
  // YachtWorld - global marketplace
  { site: "yachtworld.com", queries: [
    "site:yachtworld.com sailboat for sale Europe",
    "site:yachtworld.com powerboat for sale Europe",
    "site:yachtworld.com motor yacht for sale",
  ]},
  // Scanboat - Scandinavian + European
  { site: "scanboat.com", queries: [
    "site:scanboat.com sailboat for sale",
    "site:scanboat.com powerboat for sale",
    "site:scanboat.com motor yacht for sale",
  ]},
  // Mornar.net - Adriatic marketplace
  { site: "mornar.net", queries: [
    "site:mornar.net boat for sale",
    "site:mornar.net yacht for sale",
  ]},
  // Boats.com / Boat Trader
  { site: "boats.com", queries: [
    "site:boats.com sailboat for sale Europe",
    "site:boats.com powerboat for sale Europe",
  ]},
  // Boatshop24
  { site: "boatshop24.com", queries: [
    "site:boatshop24.com sailboat for sale",
    "site:boatshop24.com powerboat for sale",
  ]},
  // TheYachtMarket
  { site: "theyachtmarket.com", queries: [
    "site:theyachtmarket.com sailing yacht for sale",
    "site:theyachtmarket.com motor yacht for sale",
  ]},
  // Subito.it - Italian marketplace
  { site: "subito.it", queries: [
    "site:subito.it barca a vela vendita",
    "site:subito.it barca a motore vendita",
  ]},
  // Sailboatlistings
  { site: "sailboatlistings.com", queries: [
    "site:sailboatlistings.com sailboat for sale",
  ]},
];

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    boat_name: { type: "string", description: "Boat make and model name" },
    boat_type: { type: "string", description: "sailboat, powerboat, catamaran, or motor yacht" },
    price_eur: { type: "number", description: "Price in EUR. Convert from other currencies if needed." },
    year: { type: "number", description: "Year built" },
    length_feet: { type: "number", description: "Length in feet. Convert from meters if needed (multiply by 3.281)." },
    location: { type: "string", description: "Location/port (city, country)" },
    image_url: { type: "string", description: "URL of the main/first boat photo" },
    engine_info: { type: "string", description: "Engine make, model, HP, type" },
    description: { type: "string", description: "Short description of the boat, max 300 chars" },
    hull_material: { type: "string", description: "Hull material (fiberglass, wood, steel, aluminum)" },
    engine_hours: { type: "number", description: "Engine hours if available" },
    cabins: { type: "number", description: "Number of cabins" },
    fuel_type: { type: "string", description: "Fuel type (diesel, petrol, electric, hybrid)" },
  },
};

interface Listing {
  title: string;
  url: string;
  boat_type: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  engine_info: string | null;
  source: string;
  scraped_at: string;
  description: string | null;
  image_urls: string[] | null;
  hull_material: string | null;
  engine_hours: number | null;
  cabins: number | null;
  fuel_type: string | null;
}

async function searchAndExtract(apiKey: string, query: string, site: string): Promise<Listing[]> {
  const listings: Listing[] = [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit: 10,
        scrapeOptions: {
          formats: ["extract"],
          extract: {
            schema: EXTRACT_SCHEMA,
            prompt: "Extract the boat listing details. Get the boat name/model, price in EUR, year, length, location, main image URL, engine info, description, hull material, engine hours, cabins, and fuel type. If this is a listing page with one boat, extract that boat. If it's a search results page, extract the first/most prominent boat.",
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Search failed for "${query}": ${errText}`);
      return [];
    }

    const data = await res.json();
    const results = data?.data || [];

    for (const item of results) {
      if (!item.url) continue;

      const extract = item?.extract || item?.json || {};
      if (!extract.boat_name && !extract.price_eur) {
        // Fallback: at least store with title from search result
        if (item.title && !item.title.toLowerCase().includes("search") && !item.title.toLowerCase().includes("results")) {
          listings.push({
            title: item.title.substring(0, 200),
            url: item.url,
            boat_type: query.includes("powerboat") || query.includes("motor") || query.includes("motore") ? "powerboat" : "sailboat",
            price_eur: null, year: null, length_feet: null, location: null,
            image_url: null, engine_info: null, source: site,
            scraped_at: new Date().toISOString(),
            description: item.description?.substring(0, 500) || null,
            image_urls: null, hull_material: null, engine_hours: null, cabins: null, fuel_type: null,
          });
        }
        continue;
      }

      // Normalize boat type
      let boatType = (extract.boat_type || "").toLowerCase();
      if (boatType.includes("motor") || boatType.includes("power")) boatType = "powerboat";
      else if (boatType.includes("sail") || boatType.includes("vela")) boatType = "sailboat";
      else if (boatType.includes("catamaran")) boatType = "sailboat";
      else boatType = query.includes("powerboat") || query.includes("motor") || query.includes("motore") ? "powerboat" : "sailboat";

      // Validate price
      let price = extract.price_eur;
      if (price && (price < 500 || price > 100000000)) price = null;

      // Collect image URLs
      const imageUrls: string[] = [];
      if (extract.image_url) imageUrls.push(extract.image_url);
      if (item.metadata?.ogImage) imageUrls.push(item.metadata.ogImage);

      listings.push({
        title: (extract.boat_name || item.title || "Unknown").substring(0, 200),
        url: item.url,
        boat_type: boatType,
        price_eur: price || null,
        year: extract.year && extract.year > 1950 && extract.year <= new Date().getFullYear() + 1 ? extract.year : null,
        length_feet: extract.length_feet && extract.length_feet > 5 && extract.length_feet < 500 ? Math.round(extract.length_feet * 10) / 10 : null,
        location: extract.location?.substring(0, 100) || null,
        image_url: extract.image_url || null,
        engine_info: extract.engine_info?.substring(0, 200) || null,
        source: site,
        scraped_at: new Date().toISOString(),
        description: extract.description?.substring(0, 500) || item.description?.substring(0, 500) || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        hull_material: extract.hull_material || null,
        engine_hours: extract.engine_hours && extract.engine_hours > 0 ? extract.engine_hours : null,
        cabins: extract.cabins && extract.cabins > 0 ? extract.cabins : null,
        fuel_type: extract.fuel_type || null,
      });
    }
  } catch (e) {
    console.error(`Error for "${query}":`, e);
  }
  return listings;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Starting comprehensive boat listing scrape...");

    // Process all sources - run queries across sites in parallel batches
    // to avoid overwhelming Firecrawl rate limits
    const allQueries = SOURCES.flatMap(s => s.queries.map(q => ({ query: q, site: s.site })));
    console.log(`Total queries to run: ${allQueries.length}`);

    const BATCH_SIZE = 4; // 4 parallel requests at a time
    const allListings: Listing[] = [];

    for (let i = 0; i < allQueries.length; i += BATCH_SIZE) {
      const batch = allQueries.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allQueries.length / BATCH_SIZE)}...`);

      const batchResults = await Promise.all(
        batch.map(({ query, site }) => searchAndExtract(apiKey, query, site))
      );

      for (const results of batchResults) {
        allListings.push(...results);
      }

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < allQueries.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueListings = allListings.filter(l => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    console.log(`Total: ${allListings.length} raw, ${uniqueListings.length} unique listings`);

    // Upsert in chunks of 50
    const CHUNK_SIZE = 50;
    let upserted = 0;
    for (let i = 0; i < uniqueListings.length; i += CHUNK_SIZE) {
      const chunk = uniqueListings.slice(i, i + CHUNK_SIZE);
      const resp = await fetch(`${supabaseUrl}/rest/v1/cached_listings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(chunk),
      });

      if (!resp.ok) {
        console.error(`Upsert error for chunk ${i}:`, await resp.text());
      } else {
        upserted += chunk.length;
      }
    }

    // Clean up old listings (older than 14 days)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/cached_listings?scraped_at=lt.${twoWeeksAgo}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
    });

    console.log(`Done! ${upserted} listings upserted.`);

    return new Response(JSON.stringify({ success: true, total_found: allListings.length, unique: uniqueListings.length, upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

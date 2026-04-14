
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Broad search queries to discover listings from many sites
const SEARCH_QUERIES = [
  // Sailboats
  "sailboat for sale Europe price site:yachtworld.com",
  "sailboat for sale price site:boat24.com",
  "sailboat for sale site:scanboat.com",
  "sailing yacht for sale site:theyachtmarket.com",
  "sailboat for sale site:sailboatlistings.com",
  "barca a vela vendita site:subito.it",
  "sailboat for sale site:boats.com",
  "sailing yacht for sale Mediterranean",
  "used sailboat for sale Europe 2024",
  "sailboat for sale site:boatshop24.com",
  "jedrilica prodaja site:mornar.net",
  "sailboat for sale Croatia Greece",
  // Powerboats
  "powerboat for sale Europe price site:yachtworld.com",
  "powerboat for sale site:boat24.com",
  "motor boat for sale site:scanboat.com",
  "motor yacht for sale site:theyachtmarket.com",
  "barca a motore vendita site:subito.it",
  "powerboat for sale site:boats.com",
  "used powerboat for sale Europe 2024",
  "motor yacht for sale site:boatshop24.com",
  "motorna brodica prodaja site:mornar.net",
  "powerboat for sale Mediterranean",
];

function parseListingFromSearch(item: any, queryIndex: number): any | null {
  if (!item.url) return null;

  // Skip non-listing pages (search results, category pages)
  const skipPatterns = ["/search", "/results", "/category", "/login", "/register", "/about", "/contact", "/faq"];
  const urlLower = item.url.toLowerCase();
  if (skipPatterns.some(p => urlLower.includes(p))) return null;

  const text = `${item.title || ""} ${item.description || ""}`;
  const isSailboat = queryIndex < 12; // first 12 queries are sailboat

  // Parse price - try EUR first, then USD, GBP
  let price: number | null = null;
  const eurMatch = text.match(/€\s*([\d,.]+)/i) || text.match(/([\d,.]+)\s*€/i) || text.match(/EUR\s*([\d,.]+)/i);
  const usdMatch = text.match(/\$\s*([\d,.]+)/i) || text.match(/USD\s*([\d,.]+)/i);
  const gbpMatch = text.match(/£\s*([\d,.]+)/i) || text.match(/GBP\s*([\d,.]+)/i);

  if (eurMatch) {
    price = parseFloat(eurMatch[1].replace(/[,.\s]/g, (m: string) => m === "." && eurMatch[1].indexOf(".") === eurMatch[1].lastIndexOf(".") ? "." : "").replace(/[,\s]/g, ""));
    // Handle European number format (123.456 or 123,456)
    const raw = eurMatch[1].replace(/\s/g, "");
    if (raw.includes(",") && raw.includes(".")) {
      price = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    } else if (raw.includes(",") && raw.split(",").pop()!.length === 3) {
      price = parseFloat(raw.replace(/,/g, ""));
    } else if (raw.includes(".") && raw.split(".").pop()!.length === 3) {
      price = parseFloat(raw.replace(/\./g, ""));
    } else {
      price = parseFloat(raw.replace(",", "."));
    }
  } else if (usdMatch) {
    const raw = usdMatch[1].replace(/,/g, "");
    price = Math.round(parseFloat(raw) * 0.92); // rough USD->EUR
  } else if (gbpMatch) {
    const raw = gbpMatch[1].replace(/,/g, "");
    price = Math.round(parseFloat(raw) * 1.16); // rough GBP->EUR
  }

  if (price && (price < 500 || price > 50000000)) price = null;

  // Parse year
  const yearMatch = text.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Parse length
  let lengthFeet: number | null = null;
  const ftMatch = text.match(/([\d.]+)\s*(?:ft|feet|foot|')/i);
  const mMatch = text.match(/([\d.,]+)\s*m\b/i);
  if (ftMatch) {
    lengthFeet = parseFloat(ftMatch[1]);
  } else if (mMatch) {
    lengthFeet = Math.round(parseFloat(mMatch[1].replace(",", ".")) * 3.281 * 10) / 10;
  }
  if (lengthFeet && (lengthFeet < 10 || lengthFeet > 500)) lengthFeet = null;

  // Parse location
  const locations = text.match(/(?:in|at|located?\s+in|port|marina|,)\s+([A-Z][a-záéíóúàèìòùäëïöüçñ]+(?:\s+[A-Z][a-záéíóúàèìòùäëïöüçñ]+){0,2})/g);
  let location: string | null = null;
  if (locations && locations.length > 0) {
    location = locations[0].replace(/^(?:in|at|located?\s+in|port|marina|,)\s+/i, "").trim();
  }

  // Source
  let source = "";
  try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}

  // Engine info from description
  let engineInfo: string | null = null;
  const engineMatch = text.match(/(?:engine|motor|hp|cv|kw)[:\s]*([^,.]{5,50})/i);
  if (engineMatch) engineInfo = engineMatch[1].trim().substring(0, 200);

  // Description - clean up the search snippet
  let description: string | null = item.description?.substring(0, 500) || null;

  return {
    title: (item.title || "Unknown").substring(0, 200).replace(/\s*[-|].*$/, ""), // Clean trailing site name
    url: item.url,
    boat_type: isSailboat ? "sailboat" : "powerboat",
    price_eur: price,
    year,
    length_feet: lengthFeet,
    location,
    image_url: null,
    image_urls: null,
    engine_info: engineInfo,
    source,
    scraped_at: new Date().toISOString(),
    description,
    hull_material: null,
    engine_hours: null,
    cabins: null,
    fuel_type: null,
  };
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

    console.log(`Starting scrape with ${SEARCH_QUERIES.length} queries...`);

    // Phase 1: Run all searches in parallel batches of 6 (fast, no scraping)
    const BATCH_SIZE = 6;
    const allListings: any[] = [];

    for (let i = 0; i < SEARCH_QUERIES.length; i += BATCH_SIZE) {
      const batch = SEARCH_QUERIES.slice(i, i + BATCH_SIZE);
      console.log(`Search batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(SEARCH_QUERIES.length / BATCH_SIZE)}`);

      const results = await Promise.all(batch.map(async (query, batchIdx) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 10 }),
          });
          if (!res.ok) {
            console.error(`Search failed for "${query}": ${res.status}`);
            return [];
          }
          const data = await res.json();
          return (data?.data || []).map((item: any) => parseListingFromSearch(item, i + batchIdx)).filter(Boolean);
        } catch (e) {
          console.error(`Error searching "${query}":`, e);
          return [];
        }
      }));

      allListings.push(...results.flat());

      if (i + BATCH_SIZE < SEARCH_QUERIES.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueListings = allListings.filter((l: any) => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    console.log(`Phase 1 done: ${allListings.length} raw, ${uniqueListings.length} unique`);

    // Phase 2: Enrich top listings with scrape+extract (images, descriptions)
    // Pick listings that lack images - scrape up to 20 for rich data
    const toEnrich = uniqueListings.filter(l => l.price_eur).slice(0, 20);
    console.log(`Phase 2: Enriching ${toEnrich.length} listings...`);

    const ENRICH_BATCH = 5;
    for (let i = 0; i < toEnrich.length; i += ENRICH_BATCH) {
      const batch = toEnrich.slice(i, i + ENRICH_BATCH);
      await Promise.all(batch.map(async (listing: any) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: listing.url,
              formats: ["extract"],
              extract: {
                schema: {
                  type: "object",
                  properties: {
                    boat_name: { type: "string" },
                    price_eur: { type: "number" },
                    year: { type: "number" },
                    length_feet: { type: "number" },
                    location: { type: "string" },
                    images: { type: "array", items: { type: "string" }, description: "URLs of all boat photos" },
                    engine_info: { type: "string" },
                    description: { type: "string", description: "Listing description, max 500 chars" },
                    hull_material: { type: "string" },
                    engine_hours: { type: "number" },
                    cabins: { type: "number" },
                    fuel_type: { type: "string" },
                  },
                },
                prompt: "Extract the boat listing details including ALL image URLs, full description, and technical specifications.",
              },
            }),
          });

          if (!res.ok) return;
          const data = await res.json();
          const ext = data?.data?.extract || {};

          // Merge enriched data
          if (ext.boat_name) listing.title = ext.boat_name.substring(0, 200);
          if (ext.price_eur && ext.price_eur > 500) listing.price_eur = ext.price_eur;
          if (ext.year && ext.year > 1950) listing.year = ext.year;
          if (ext.length_feet && ext.length_feet > 5) listing.length_feet = Math.round(ext.length_feet * 10) / 10;
          if (ext.location) listing.location = ext.location.substring(0, 100);
          if (ext.images && ext.images.length > 0) {
            listing.image_url = ext.images[0];
            listing.image_urls = ext.images.slice(0, 10);
          }
          if (ext.engine_info) listing.engine_info = ext.engine_info.substring(0, 200);
          if (ext.description) listing.description = ext.description.substring(0, 500);
          if (ext.hull_material) listing.hull_material = ext.hull_material;
          if (ext.engine_hours && ext.engine_hours > 0) listing.engine_hours = ext.engine_hours;
          if (ext.cabins && ext.cabins > 0) listing.cabins = ext.cabins;
          if (ext.fuel_type) listing.fuel_type = ext.fuel_type;
        } catch (e) {
          console.error(`Enrich failed for ${listing.url}:`, e);
        }
      }));

      if (i + ENRICH_BATCH < toEnrich.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`Phase 2 done. Upserting ${uniqueListings.length} listings...`);

    // Upsert in chunks
    const CHUNK = 50;
    let upserted = 0;
    for (let i = 0; i < uniqueListings.length; i += CHUNK) {
      const chunk = uniqueListings.slice(i, i + CHUNK);
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
        console.error(`Upsert error:`, await resp.text());
      } else {
        upserted += chunk.length;
      }
    }

    // Clean up old listings (> 14 days)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/cached_listings?scraped_at=lt.${twoWeeksAgo}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey },
    });

    console.log(`Done! ${upserted} listings upserted.`);

    return new Response(JSON.stringify({ success: true, total: allListings.length, unique: uniqueListings.length, enriched: toEnrich.length, upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

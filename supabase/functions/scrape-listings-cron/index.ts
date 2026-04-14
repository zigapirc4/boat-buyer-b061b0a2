
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Massive query list covering many sites, regions, boat types, and sizes
const SEARCH_QUERIES = [
  // === SAILBOATS by site ===
  "sailboat for sale site:yachtworld.com",
  "sailing yacht for sale site:yachtworld.com",
  "cruising sailboat for sale site:yachtworld.com",
  "sailboat for sale site:boat24.com",
  "segelboot kaufen site:boat24.com",
  "voilier vente site:boat24.com",
  "sailboat for sale site:scanboat.com",
  "sailing yacht site:scanboat.com",
  "sailboat for sale site:theyachtmarket.com",
  "sailboat for sale site:sailboatlistings.com",
  "cruiser sailboat for sale site:sailboatlistings.com",
  "sailboat for sale site:boats.com",
  "sailing yacht for sale site:boats.com",
  "sailboat for sale site:boatshop24.com",
  "jedrilica prodaja site:mornar.net",
  "jedrilica na prodaj site:mornar.net",
  "barca a vela vendita site:subito.it",
  "barca a vela usata site:subito.it",
  // === SAILBOATS by region ===
  "sailboat for sale Croatia",
  "sailboat for sale Greece",
  "sailboat for sale Italy",
  "sailboat for sale France Mediterranean",
  "sailboat for sale Spain",
  "sailboat for sale Turkey",
  "sailboat for sale Montenegro",
  "sailboat for sale Slovenia",
  "sailboat for sale Germany Baltic",
  "sailboat for sale Netherlands",
  "sailboat for sale Denmark",
  "sailboat for sale Sweden",
  "sailboat for sale UK",
  "sailboat for sale Portugal",
  "sailboat for sale Adriatic",
  "sailboat for sale Caribbean",
  "sailboat for sale Florida",
  // === SAILBOATS by size ===
  "sailboat 25 30 feet for sale Europe",
  "sailboat 30 35 feet for sale Europe",
  "sailboat 35 40 feet for sale Europe",
  "sailboat 40 45 feet for sale Europe",
  "sailboat 45 50 feet for sale",
  "sailboat over 50 feet for sale",
  "catamaran sailboat for sale Europe",
  // === POWERBOATS by site ===
  "powerboat for sale site:yachtworld.com",
  "motor yacht for sale site:yachtworld.com",
  "speedboat for sale site:yachtworld.com",
  "powerboat for sale site:boat24.com",
  "motorboot kaufen site:boat24.com",
  "bateau moteur vente site:boat24.com",
  "powerboat for sale site:scanboat.com",
  "motor boat for sale site:scanboat.com",
  "powerboat for sale site:theyachtmarket.com",
  "powerboat for sale site:boats.com",
  "motor yacht for sale site:boats.com",
  "powerboat for sale site:boatshop24.com",
  "motorna brodica prodaja site:mornar.net",
  "gliser prodaja site:mornar.net",
  "barca a motore vendita site:subito.it",
  "barca a motore usata site:subito.it",
  "gommone vendita site:subito.it",
  // === POWERBOATS by region ===
  "powerboat for sale Croatia",
  "powerboat for sale Greece",
  "powerboat for sale Italy",
  "powerboat for sale France",
  "powerboat for sale Spain",
  "powerboat for sale Turkey",
  "powerboat for sale Montenegro",
  "powerboat for sale Slovenia",
  "powerboat for sale Germany",
  "powerboat for sale Netherlands",
  "powerboat for sale UK",
  "powerboat for sale Florida",
  "powerboat for sale Adriatic",
  // === POWERBOATS by size/type ===
  "center console boat for sale Europe",
  "cabin cruiser for sale Europe",
  "flybridge motor yacht for sale",
  "RIB rigid inflatable boat for sale Europe",
  "fishing boat for sale Mediterranean",
  "sport fishing boat for sale Europe",
  "trawler yacht for sale Europe",
  "motor yacht 30 40 feet for sale",
  "motor yacht 40 50 feet for sale",
  "motor yacht over 50 feet for sale",
  // === BRANDS ===
  "Bavaria sailboat for sale",
  "Beneteau sailboat for sale",
  "Jeanneau sailboat for sale",
  "Hanse sailboat for sale",
  "Dufour sailboat for sale",
  "Elan sailboat for sale",
  "Bavaria motorboat for sale",
  "Beneteau powerboat for sale",
  "Fairline boat for sale",
  "Princess yacht for sale",
  "Azimut yacht for sale",
  "Sunseeker yacht for sale",
  "Cranchi boat for sale",
  "Sessa boat for sale",
  "Quicksilver boat for sale",
  "Jeanneau powerboat for sale",
];

const SAILBOAT_QUERY_COUNT = 43; // queries 0-42 are sailboats

function parseListingFromSearch(item: any, queryIndex: number): any | null {
  if (!item.url) return null;

  const skipPatterns = ["/search", "/results", "/category", "/login", "/register", "/about", "/contact", "/faq", "/privacy", "/terms"];
  const urlLower = item.url.toLowerCase();
  if (skipPatterns.some(p => urlLower.includes(p))) return null;

  const text = `${item.title || ""} ${item.description || ""}`;
  const isSailboat = queryIndex < SAILBOAT_QUERY_COUNT;

  // Parse price
  let price: number | null = null;
  const eurMatch = text.match(/€\s*([\d,.]+)/i) || text.match(/([\d,.]+)\s*€/i) || text.match(/EUR\s*([\d,.]+)/i);
  const usdMatch = text.match(/\$\s*([\d,.]+)/i) || text.match(/USD\s*([\d,.]+)/i);
  const gbpMatch = text.match(/£\s*([\d,.]+)/i) || text.match(/GBP\s*([\d,.]+)/i);

  if (eurMatch) {
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
    price = Math.round(parseFloat(usdMatch[1].replace(/,/g, "")) * 0.92);
  } else if (gbpMatch) {
    price = Math.round(parseFloat(gbpMatch[1].replace(/,/g, "")) * 1.16);
  }

  if (price && (price < 500 || price > 50000000)) price = null;

  const yearMatch = text.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  let lengthFeet: number | null = null;
  const ftMatch = text.match(/([\d.]+)\s*(?:ft|feet|foot|')/i);
  const mMatch = text.match(/([\d.,]+)\s*m\b/i);
  if (ftMatch) lengthFeet = parseFloat(ftMatch[1]);
  else if (mMatch) lengthFeet = Math.round(parseFloat(mMatch[1].replace(",", ".")) * 3.281 * 10) / 10;
  if (lengthFeet && (lengthFeet < 10 || lengthFeet > 500)) lengthFeet = null;

  const locations = text.match(/(?:in|at|located?\s+in|port|marina|,)\s+([A-Z][a-záéíóúàèìòùäëïöüçñ]+(?:\s+[A-Z][a-záéíóúàèìòùäëïöüçñ]+){0,2})/g);
  let location: string | null = null;
  if (locations && locations.length > 0) {
    location = locations[0].replace(/^(?:in|at|located?\s+in|port|marina|,)\s+/i, "").trim();
  }

  let source = "";
  try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}

  let engineInfo: string | null = null;
  const engineMatch = text.match(/(?:engine|motor|hp|cv|kw)[:\s]*([^,.]{5,50})/i);
  if (engineMatch) engineInfo = engineMatch[1].trim().substring(0, 200);

  const description: string | null = item.description?.substring(0, 500) || null;

  // Try to extract image from search result
  let imageUrl: string | null = null;
  let imageUrls: string[] | null = null;
  if (item.image) {
    imageUrl = item.image;
    imageUrls = [item.image];
  }

  return {
    title: (item.title || "Unknown").substring(0, 200).replace(/\s*[-|].*$/, ""),
    url: item.url,
    boat_type: isSailboat ? "sailboat" : "powerboat",
    price_eur: price,
    year,
    length_feet: lengthFeet,
    location,
    image_url: imageUrl,
    image_urls: imageUrls,
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

    // Allow passing a subset of queries to split across multiple invocations
    let startIdx = 0;
    let endIdx = SEARCH_QUERIES.length;
    let skipEnrich = false;
    try {
      const body = await req.json();
      if (body.startIdx !== undefined) startIdx = body.startIdx;
      if (body.endIdx !== undefined) endIdx = body.endIdx;
      if (body.skipEnrich) skipEnrich = true;
    } catch {}

    const queries = SEARCH_QUERIES.slice(startIdx, endIdx);
    console.log(`Starting scrape: queries ${startIdx}-${endIdx} (${queries.length} queries)...`);

    // Phase 1: Search with higher limits
    const BATCH_SIZE = 5;
    const allListings: any[] = [];

    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      console.log(`Search batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(queries.length / BATCH_SIZE)}`);

      const results = await Promise.all(batch.map(async (query, batchIdx) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 20 }),
          });
          if (!res.ok) {
            console.error(`Search failed for "${query}": ${res.status}`);
            return [];
          }
          const data = await res.json();
          return (data?.data || []).map((item: any) => parseListingFromSearch(item, startIdx + i + batchIdx)).filter(Boolean);
        } catch (e) {
          console.error(`Error searching "${query}":`, e);
          return [];
        }
      }));

      allListings.push(...results.flat());

      if (i + BATCH_SIZE < queries.length) {
        await new Promise(r => setTimeout(r, 500));
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

    // Phase 2: Enrich listings that have a price (up to 30)
    const toEnrich = uniqueListings.filter(l => l.price_eur).slice(0, 30);
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
                    description: { type: "string", description: "Full listing description, max 500 chars" },
                    hull_material: { type: "string" },
                    engine_hours: { type: "number" },
                    cabins: { type: "number" },
                    fuel_type: { type: "string" },
                  },
                },
                prompt: "Extract all boat listing details including ALL image URLs, full description, and technical specifications.",
              },
            }),
          });

          if (!res.ok) return;
          const data = await res.json();
          const ext = data?.data?.extract || {};

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
        await new Promise(r => setTimeout(r, 300));
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

    console.log(`Done! ${upserted} listings upserted.`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: allListings.length, 
      unique: uniqueListings.length, 
      enriched: toEnrich.length, 
      upserted,
      queryRange: `${startIdx}-${endIdx}`,
    }), {
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

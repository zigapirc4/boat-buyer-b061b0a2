
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Targeted queries that return INDIVIDUAL listings, not search pages
const SEARCH_QUERIES = [
  // === SAILBOATS - specific listings with details ===
  "Bavaria 34 sailboat for sale €",
  "Bavaria 37 cruiser sailboat for sale price",
  "Beneteau Oceanis 38 for sale EUR",
  "Beneteau Oceanis 43 for sale price",
  "Beneteau First 35 for sale €",
  "Jeanneau Sun Odyssey 36 for sale €",
  "Jeanneau Sun Odyssey 42 for sale price",
  "Jeanneau Sun Odyssey 49 for sale EUR",
  "Hanse 345 sailboat for sale €",
  "Hanse 385 sailboat for sale price",
  "Hanse 415 sailboat for sale EUR",
  "Dufour 382 sailboat for sale €",
  "Dufour 412 sailboat for sale price",
  "Elan 340 sailboat for sale €",
  "Elan Impression 40 sailboat for sale",
  "Elan E5 sailboat for sale price",
  "Dehler 34 sailboat for sale €",
  "Dehler 38 sailboat for sale price",
  "Hallberg-Rassy 34 for sale €",
  "Hallberg-Rassy 40 for sale price",
  "Nauticat 33 sailboat for sale",
  "X-Yachts X4 for sale €",
  "Catalina 36 sailboat for sale",
  "Hunter 36 sailboat for sale price",
  "Lagoon 380 catamaran for sale €",
  "Lagoon 42 catamaran for sale price",
  "Fountaine Pajot catamaran for sale EUR",
  // Regional sailboat listings
  "sailboat for sale Croatia site:yachtworld.com",
  "sailboat for sale Greece site:yachtworld.com",
  "sailboat for sale Italy site:boat24.com",
  "segelboot kaufen Kroatien site:boat24.com",
  "jedrilica prodaja site:mornar.net",
  "jedrilica Hrvatska site:mornar.net",
  "barca a vela vendita Croazia site:boat24.com",
  "sailboat for sale Mediterranean site:scanboat.com",
  "sailboat for sale Adriatic site:theyachtmarket.com",
  "sailboat for sale Slovenia site:boat24.com",
  "sailboat for sale Turkey site:yachtworld.com",
  "sailboat for sale France site:boat24.com",
  "sailboat for sale Spain site:yachtworld.com",
  "sailboat 30ft for sale site:sailboatlistings.com",
  "sailboat 35ft for sale site:sailboatlistings.com",
  "sailboat 40ft for sale site:sailboatlistings.com",
  // === POWERBOATS - specific listings with details ===
  "Bavaria Sport 29 for sale €",
  "Beneteau Antares 8 for sale price",
  "Beneteau Antares 9 for sale EUR",
  "Jeanneau Cap Camarat 7.5 for sale €",
  "Jeanneau Merry Fisher 795 for sale price",
  "Fairline Targa 38 for sale €",
  "Fairline Squadron 42 for sale price",
  "Princess V39 for sale EUR",
  "Princess V50 for sale price",
  "Azimut 42 for sale €",
  "Azimut 55 for sale price",
  "Sunseeker Manhattan 52 for sale",
  "Sunseeker Predator 57 for sale price",
  "Cranchi Endurance 30 for sale €",
  "Cranchi Z35 for sale price",
  "Sessa C35 for sale €",
  "Sessa C38 for sale price",
  "Quicksilver Activ 755 for sale €",
  "Quicksilver Activ 875 for sale price",
  "Nimbus 305 for sale €",
  "Nimbus 365 for sale price",
  "Galeon 325 for sale €",
  "Galeon 430 for sale price",
  "Sea Ray Sundancer 320 for sale €",
  "Boston Whaler 280 for sale price",
  "Prestige 420 for sale EUR",
  "Prestige 520 for sale price",
  "Absolute 40 for sale €",
  "Absolute 50 for sale price",
  // Regional powerboat listings
  "powerboat for sale Croatia site:yachtworld.com",
  "powerboat for sale Greece site:yachtworld.com",
  "powerboat for sale Italy site:boat24.com",
  "motorboot kaufen Kroatien site:boat24.com",
  "motorna brodica prodaja site:mornar.net",
  "gliser prodaja site:mornar.net",
  "barca a motore vendita site:boat24.com",
  "gommone vendita Croazia site:boat24.com",
  "powerboat for sale Mediterranean site:scanboat.com",
  "powerboat for sale Adriatic site:theyachtmarket.com",
  "powerboat for sale Slovenia site:boat24.com",
  "powerboat for sale Turkey site:yachtworld.com",
  "motorboat for sale France site:boat24.com",
  "motorboat for sale Spain site:yachtworld.com",
  "center console for sale site:boats.com Mediterranean",
  "cabin cruiser for sale site:boats.com Europe",
  "RIB inflatable for sale site:boat24.com",
  "fishing boat for sale site:yachtworld.com Mediterranean",
  "trawler for sale site:yachtworld.com Europe",
];

const SAILBOAT_QUERY_COUNT = 44; // queries 0-43 are sailboats

// Hard reject patterns — these are NEVER individual listings
const REJECT_URL_PATTERNS = [
  "/login", "/register", "/about", "/contact", "/faq", "/privacy", "/terms",
  "/blog", "/news", "/article", "/guide", "/review",
  "youtube.com", "facebook.com", "instagram.com", "twitter.com",
  "reddit.com", "wikipedia.org", "pinterest.com", "tiktok.com",
  "/home/product-range", "/model-range",
  "boat-buyers-guide", "/buyer",
];

// Known boat marketplace domains — URLs from these are likely valid
const KNOWN_BOAT_SITES = [
  "yachtworld.com", "boat24.com", "mornar.net", "scanboat.com",
  "boats.com", "sailboatlistings.com", "subito.it", "theyachtmarket.com",
  "boatshop24.com", "bandofboats.com", "apolloduck", "devalk.nl",
  "yachtall.com", "rightboat.com", "boattrader.com", "botentekoop.com",
  "cosmos-yachting.com", "nonstopboats.com", "itboat.com",
  "grabau-international.com", "euroyachts.com", "sysyachtsales.com",
  "yachthub.com", "multihullcompany.com", "yachtsaleswest.com",
  "denisonyachtsales.com", "curtisstokes.net", "networkYachtBrokers",
  "boatsall.com", "boatsonline.com", "sailsquare.com",
  "cfrancisyachts.com", "ancasta.com", "broomyachts.com",
];

// URL patterns that indicate a SEARCH or CATEGORY page (not a listing)
const SEARCH_PAGE_PATTERNS = [
  /\?make=/i, /&make=/i,
  /\?SearchCriteria/i,
  /\?q=/i, /&q=/i,
  /view_records=1/i,
  /\/boats-for-sale\/\?/i,             // boats.com search with params
  /yachtworld\.com\/boats-for-sale\/make-/i,
  /boats\.com\/boats-for-sale/i,
  /boattrader\.com\/boats\/make-/i,
  /boattrader\.com\/boats\/type-/i,
  /\/annunci-\w+\/vendita\//i,         // subito.it search pages
  /mornar\.net\/[Ss]how\/results\.asp/i,
  /scanboat\.com\/\w+\/boat-market\/boats\?/i,
  /theyachtmarket\.com\/en\/\?/i,      // homepage with params
  /sailboatlistings\.com\/sailboats_/i, // category pages
  /sailboatlistings\.com\/location\//i,
  /sailboatlistings\.com\/cgi-bin\//i,
  /sailboatlistings\.com\/$/,
];

function isLikelyListingUrl(url: string): boolean {
  const urlLower = url.toLowerCase();

  // Hard reject
  if (REJECT_URL_PATTERNS.some(p => urlLower.includes(p.toLowerCase()))) return false;

  // Reject search/category pages on known sites
  if (SEARCH_PAGE_PATTERNS.some(r => r.test(url))) return false;

  // Accept if it's from a known boat site (after search page rejection)
  const isKnownSite = KNOWN_BOAT_SITES.some(s => urlLower.includes(s.toLowerCase()));
  if (isKnownSite) {
    // Still reject if URL is just the homepage
    const path = new URL(url).pathname;
    if (path === "/" || path === "") return false;
    return true;
  }

  // For unknown sites, require strong listing indicators
  const hasNumericId = /[-/]\d{5,}/.test(url) || /\/\d{4,}[-/]/.test(url);
  const hasListingPath = /\/(boat|yacht|listing|ad|detail|offer|annonce|oglas|inserzione)s?[/-]/i.test(url);
  const endsWithHtml = /\.html$/i.test(url);
  
  if (hasListingPath && hasNumericId) return true;
  if (endsWithHtml && hasNumericId) return true;
  if (hasNumericId && url.split("/").filter(Boolean).length >= 4) return true;

  return false;
}

function parseListingFromSearch(item: any, queryIndex: number): any | null {
  if (!item.url) return null;
  if (!isLikelyListingUrl(item.url)) return null;

  const text = `${item.title || ""} ${item.description || ""}`;
  const isSailboat = queryIndex < SAILBOAT_QUERY_COUNT;

  // Reject titles that are clearly category pages
  const titleLower = (item.title || "").toLowerCase();
  const categoryPhrases = [
    "boats for sale", "yachts for sale", "for sale in", "find your",
    "browse", "search results", "listings", "used boats",
    "new and used", "buy and sell", "marketplace",
  ];
  if (categoryPhrases.some(p => titleLower.includes(p)) && !titleLower.match(/\d{4}/)) return null;

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

  // Require at least price OR (year AND length) to consider it a real listing
  if (!price && !(year && lengthFeet)) return null;

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

    // Phase 1: Search
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

    console.log(`Phase 1 done: ${allListings.length} raw, ${uniqueListings.length} unique (after quality filter)`);

    // Phase 2: Enrich top listings via scrape+extract
    const toEnrich = skipEnrich ? [] : uniqueListings.slice(0, 10);
    console.log(`Phase 2: Enriching ${toEnrich.length} listings${skipEnrich ? " (skipped)" : ""}...`);

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


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Targeted queries that return INDIVIDUAL listings, not search pages
const SEARCH_QUERIES = [
  // === SAILBOATS - brand+model specific ===
  "Bavaria 34 cruiser for sale", "Bavaria 37 cruiser for sale", "Bavaria 40 cruiser for sale",
  "Bavaria 46 cruiser for sale", "Bavaria 33 for sale", "Bavaria Vision 42 for sale",
  "Beneteau Oceanis 38 for sale", "Beneteau Oceanis 43 for sale", "Beneteau Oceanis 46 for sale",
  "Beneteau Oceanis 50 for sale", "Beneteau First 35 for sale", "Beneteau First 40 for sale",
  "Jeanneau Sun Odyssey 36 for sale", "Jeanneau Sun Odyssey 39 for sale",
  "Jeanneau Sun Odyssey 42 for sale", "Jeanneau Sun Odyssey 49 for sale",
  "Jeanneau Sun Odyssey 440 for sale", "Jeanneau Sun Odyssey 490 for sale",
  "Hanse 345 for sale", "Hanse 385 for sale", "Hanse 415 for sale", "Hanse 455 for sale",
  "Hanse 505 for sale", "Hanse 548 for sale",
  "Dufour 382 for sale", "Dufour 412 for sale", "Dufour 460 for sale", "Dufour 530 for sale",
  "Elan 340 for sale", "Elan Impression 40 for sale", "Elan Impression 45 for sale",
  "Elan E5 for sale", "Elan GT5 for sale",
  "Dehler 34 for sale", "Dehler 38 for sale", "Dehler 42 for sale",
  "Hallberg-Rassy 34 for sale", "Hallberg-Rassy 40 for sale", "Hallberg-Rassy 44 for sale",
  "X-Yachts X4 for sale", "X-Yachts Xc 38 for sale",
  "Najad 355 for sale", "Najad 440 for sale",
  "Catalina 36 for sale", "Catalina 42 for sale",
  "Hunter 36 for sale", "Hunter 41 for sale",
  "Lagoon 380 catamaran for sale", "Lagoon 40 for sale", "Lagoon 42 for sale", "Lagoon 450 for sale",
  "Fountaine Pajot Lucia 40 for sale", "Fountaine Pajot Elba 45 for sale",
  "Nautitech 40 for sale", "Nautitech 46 for sale",
  "Grand Soleil 39 for sale", "Grand Soleil 46 for sale",
  "Feeling 39 for sale", "Moody 38 for sale", "Moody 45 for sale",
  "Swan 42 for sale", "Swan 48 for sale",
  "Oyster 485 for sale", "Contest 42 for sale",
  // Sailboat regional
  "sailboat Croatia site:yachtworld.com", "sailboat Greece site:yachtworld.com",
  "sailboat Italy site:yachtworld.com", "sailboat Turkey site:yachtworld.com",
  "sailboat Spain site:yachtworld.com", "sailboat France site:yachtworld.com",
  "segelboot site:boat24.com", "jedrilica site:mornar.net",
  "sailboat site:scanboat.com", "sailboat site:theyachtmarket.com",
  "sailboat site:sailboatlistings.com",
  "barca a vela site:boat24.com",
  // === POWERBOATS - brand+model specific ===
  "Bavaria Sport 29 for sale", "Bavaria S33 for sale", "Bavaria R40 for sale",
  "Beneteau Antares 8 for sale", "Beneteau Antares 9 for sale", "Beneteau Gran Turismo 40 for sale",
  "Jeanneau Cap Camarat 7.5 for sale", "Jeanneau Merry Fisher 795 for sale",
  "Jeanneau Merry Fisher 895 for sale", "Jeanneau NC 37 for sale",
  "Fairline Targa 38 for sale", "Fairline Squadron 42 for sale", "Fairline Targa 48 for sale",
  "Princess V39 for sale", "Princess V50 for sale", "Princess F45 for sale",
  "Azimut 42 for sale", "Azimut 50 for sale", "Azimut 55 for sale",
  "Sunseeker Manhattan 52 for sale", "Sunseeker Predator 57 for sale",
  "Cranchi Endurance 30 for sale", "Cranchi Z35 for sale", "Cranchi E56 for sale",
  "Sessa C35 for sale", "Sessa C38 for sale", "Sessa C44 for sale",
  "Quicksilver Activ 755 for sale", "Quicksilver Activ 875 for sale",
  "Nimbus 305 for sale", "Nimbus 365 for sale", "Nimbus W11 for sale",
  "Galeon 325 for sale", "Galeon 430 for sale", "Galeon 500 for sale",
  "Sea Ray Sundancer 320 for sale", "Sea Ray 350 for sale",
  "Boston Whaler 280 for sale", "Boston Whaler 330 for sale",
  "Prestige 420 for sale", "Prestige 520 for sale", "Prestige 630 for sale",
  "Absolute 40 for sale", "Absolute 50 for sale", "Absolute 56 for sale",
  "Saxdor 320 for sale", "Saxdor 400 for sale",
  "Finnmaster T8 for sale", "Finnmaster T9 for sale",
  "Parker 760 for sale", "Parker 850 for sale",
  "Axopar 28 for sale", "Axopar 37 for sale",
  "Regal 33 for sale", "Regal 38 for sale",
  "Wellcraft 355 for sale", "Chaparral 310 for sale",
  "Bayliner VR6 for sale", "Four Winns 350 for sale",
  // Powerboat regional
  "powerboat Croatia site:yachtworld.com", "powerboat Greece site:yachtworld.com",
  "powerboat Italy site:yachtworld.com", "powerboat Turkey site:yachtworld.com",
  "motorboot site:boat24.com", "motorna brodica site:mornar.net", "gliser site:mornar.net",
  "powerboat site:scanboat.com", "powerboat site:theyachtmarket.com",
  "barca a motore site:boat24.com",
  // === MIXED - price range + region combos ===
  "yacht for sale under 50000 Europe", "yacht for sale under 100000 Mediterranean",
  "used sailboat 30000 50000 Europe", "used sailboat 50000 100000 Europe",
  "used powerboat 30000 80000 Europe", "used powerboat 50000 150000 Mediterranean",
  "boat for sale Croatia under 50000", "boat for sale Croatia 50000 100000",
  "boat for sale Italy under 80000", "boat for sale Greece under 100000",
  "boat for sale Slovenia", "boat for sale Montenegro",
  "boat for sale Adriatic", "boat for sale Mediterranean under 100000",
];

const SAILBOAT_QUERY_COUNT = 76; // queries 0-75 are sailboats

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
  const textLower = text.toLowerCase();
  
  // Detect boat type from content first, fall back to query index
  const SAILBOAT_KEYWORDS = ["sailboat", "sailing", "sloop", "ketch", "cutter", "catamaran", "trimaran", "jedrilica", "barca a vela", "segelboot", "voilier", "velero", "oceanis", "sun odyssey", "hanse ", "dehler", "hallberg", "bavaria cruiser", "dufour", "elan impression", "grand soleil", "najad", "x-yachts", "catalina", "hunter ", "lagoon", "fountaine pajot", "nautitech", "oyster", "contest", "swan ", "feeling", "moody"];
  const POWERBOAT_KEYWORDS = ["powerboat", "motorboat", "motor yacht", "flybridge", "express cruiser", "center console", "cabin cruiser", "sport boat", "gliser", "motorna", "motorboot", "barca a motore", "bateau moteur", "antares", "merry fisher", "cap camarat", "fairline", "princess v", "azimut", "sunseeker", "cranchi", "sessa", "quicksilver", "nimbus", "galeon", "sea ray", "boston whaler", "prestige", "absolute", "saxdor", "axopar"];
  
  const isSailFromContent = SAILBOAT_KEYWORDS.some(k => textLower.includes(k));
  const isPowerFromContent = POWERBOAT_KEYWORDS.some(k => textLower.includes(k));
  
  let boatType: string;
  if (isSailFromContent && !isPowerFromContent) boatType = "sailboat";
  else if (isPowerFromContent && !isSailFromContent) boatType = "powerboat";
  else boatType = queryIndex < SAILBOAT_QUERY_COUNT ? "sailboat" : "powerboat";

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
    boat_type: boatType,
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

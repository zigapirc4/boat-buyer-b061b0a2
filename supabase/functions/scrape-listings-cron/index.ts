
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== ONLY these 3 sites =====
const ALLOWED_DOMAINS = ["boat24.com", "mornar.net", "subito.it"];

// Brands and models for queries
const SAILBOAT_BRANDS = [
  "Bavaria 34", "Bavaria 37", "Bavaria 40", "Bavaria 46", "Bavaria 33", "Bavaria Vision 42",
  "Beneteau Oceanis 38", "Beneteau Oceanis 43", "Beneteau Oceanis 46", "Beneteau Oceanis 50",
  "Beneteau First 35", "Beneteau First 40", "Beneteau Oceanis 35", "Beneteau Oceanis 40",
  "Jeanneau Sun Odyssey 36", "Jeanneau Sun Odyssey 39", "Jeanneau Sun Odyssey 42",
  "Jeanneau Sun Odyssey 49", "Jeanneau Sun Odyssey 440", "Jeanneau Sun Odyssey 490",
  "Jeanneau Sun Odyssey 32", "Jeanneau Sun Odyssey 45",
  "Hanse 345", "Hanse 385", "Hanse 415", "Hanse 455", "Hanse 505", "Hanse 548", "Hanse 315", "Hanse 375",
  "Dufour 382", "Dufour 412", "Dufour 460", "Dufour 530", "Dufour 310", "Dufour 350", "Dufour 36",
  "Elan 340", "Elan Impression 40", "Elan Impression 45", "Elan E5", "Elan GT5", "Elan 333", "Elan 350", "Elan 37", "Elan 434",
  "Dehler 34", "Dehler 38", "Dehler 42", "Dehler 30", "Dehler 46",
  "Hallberg-Rassy 34", "Hallberg-Rassy 40", "Hallberg-Rassy 44", "Hallberg-Rassy 31", "Hallberg-Rassy 37",
  "X-Yachts X4", "X-Yachts Xc 38", "X-Yachts X40",
  "Najad 355", "Najad 440", "Najad 373",
  "Catalina 36", "Catalina 42", "Catalina 30", "Catalina 34", "Catalina 38",
  "Hunter 36", "Hunter 41", "Hunter 33", "Hunter 38", "Hunter 44",
  "Lagoon 380", "Lagoon 40", "Lagoon 42", "Lagoon 450", "Lagoon 39", "Lagoon 52",
  "Fountaine Pajot Lucia 40", "Fountaine Pajot Elba 45", "Fountaine Pajot Mahe 36",
  "Nautitech 40", "Nautitech 46",
  "Grand Soleil 39", "Grand Soleil 46", "Grand Soleil 34",
  "Feeling 39", "Moody 38", "Moody 45", "Moody 34",
  "Swan 42", "Swan 48", "Swan 36",
  "Oyster 485", "Contest 42", "Contest 36",
];

const POWERBOAT_BRANDS = [
  "Bavaria Sport 29", "Bavaria S33", "Bavaria R40",
  "Beneteau Antares 8", "Beneteau Antares 9", "Beneteau Gran Turismo 40", "Beneteau Antares 7", "Beneteau Flyer 8",
  "Jeanneau Cap Camarat 7.5", "Jeanneau Merry Fisher 795", "Jeanneau Merry Fisher 895",
  "Jeanneau NC 37", "Jeanneau Leader 33", "Jeanneau Cap Camarat 9.0",
  "Fairline Targa 38", "Fairline Squadron 42", "Fairline Targa 48", "Fairline Phantom 40",
  "Princess V39", "Princess V50", "Princess F45", "Princess V40", "Princess 56",
  "Azimut 42", "Azimut 50", "Azimut 55", "Azimut 36", "Azimut 46", "Azimut 60",
  "Sunseeker Manhattan 52", "Sunseeker Predator 57", "Sunseeker San Remo 33",
  "Cranchi Endurance 30", "Cranchi Z35", "Cranchi E56", "Cranchi 33",
  "Sessa C35", "Sessa C38", "Sessa C44", "Sessa Key Largo 28",
  "Quicksilver Activ 755", "Quicksilver Activ 875", "Quicksilver 605", "Quicksilver 675",
  "Nimbus 305", "Nimbus 365", "Nimbus W11", "Nimbus 27",
  "Galeon 325", "Galeon 430", "Galeon 500", "Galeon 360", "Galeon 380",
  "Sea Ray Sundancer 320", "Sea Ray 350", "Sea Ray 290", "Sea Ray 250",
  "Boston Whaler 280", "Boston Whaler 330",
  "Prestige 420", "Prestige 520", "Prestige 630", "Prestige 460", "Prestige 500",
  "Absolute 40", "Absolute 50", "Absolute 56", "Absolute 45",
  "Saxdor 320", "Saxdor 400", "Saxdor 200",
  "Finnmaster T8", "Finnmaster T9",
  "Parker 760", "Parker 850", "Parker 690",
  "Axopar 28", "Axopar 37", "Axopar 22",
  "Regal 33", "Regal 38", "Regal 28",
  "Wellcraft 355", "Chaparral 310", "Bayliner VR6", "Four Winns 350",
  "Ferretti 530", "Ferretti 460", "Riva 56", "Pershing 46",
  "Chris-Craft 30", "Grady-White 330", "Robalo 302",
];

// Generic terms for each site
const BOAT24_GENERIC = [
  "segelboot", "motorboot", "segelyacht", "motoryacht", "katamaran",
  "gebrauchte segelboot", "gebrauchte motorboot", "yacht", "kajütboot",
  "segelboot Kroatien", "segelboot Italien", "segelboot Griechenland",
  "segelboot Türkei", "segelboot Spanien", "segelboot Frankreich",
  "motorboot Kroatien", "motorboot Italien", "motorboot Griechenland",
  "segelboot Slowenien", "segelboot Montenegro", "segelboot Adria",
  "motorboot Adria", "motorboot Mittelmeer", "segelboot unter 50000",
  "motorboot unter 50000", "segelboot unter 30000", "motorboot unter 30000",
  "segelboot unter 100000", "motorboot unter 100000",
  "segelboot unter 20000", "motorboot unter 20000",
  "segelboot unter 80000", "motorboot unter 80000",
  "segeln gebraucht", "motorboot gebraucht",
  "barca a vela", "barca a motore",
  "sailboat", "powerboat", "sailing yacht", "motor yacht",
  "cruiser", "trimaran", "sloop", "ketch", "cutter", "flybridge",
  "center console", "cabin cruiser", "sport boat", "trawler",
  "daycruiser", "bowrider", "walkaround", "express cruiser",
];

const MORNAR_GENERIC = [
  "jedrilica", "motorna brodica", "gliser", "jahta", "katamaran",
  "jedrilica Hrvatska", "jedrilica Slovenija", "jedrilica Crna Gora",
  "jedrilica Italija", "jedrilica Grčka",
  "motorna brodica Hrvatska", "motorna brodica Slovenija",
  "gliser Hrvatska", "jahta Hrvatska",
  "brod na prodaju", "plovilo na prodaju",
  "sailboat Croatia", "sailboat Slovenia", "sailboat Montenegro",
  "sailboat Italy", "sailboat for sale Adriatic",
  "powerboat Croatia", "powerboat Slovenia",
  "boat for sale Croatia", "boat for sale Slovenia",
  "yacht Croatia", "yacht Adriatic",
  "sail boat", "motor boat", "used sailboat", "used powerboat",
  "bavaria", "beneteau", "jeanneau", "elan", "hanse", "lagoon",
  "azimut", "sessa", "fairline", "princess",
];

const SUBITO_GENERIC = [
  "barca a vela", "barca a motore", "yacht", "catamarano",
  "barca a vela usata", "barca a motore usata",
  "barca vela Liguria", "barca vela Sardegna", "barca vela Sicilia",
  "barca vela Toscana", "barca vela Campania", "barca vela Puglia",
  "barca motore Liguria", "barca motore Sardegna", "barca motore Sicilia",
  "barca vela Lazio", "barca vela Calabria", "barca vela Veneto",
  "barca motore Toscana", "barca motore Campania", "barca motore Puglia",
  "barca motore Lazio", "barca motore Calabria", "barca motore Veneto",
  "gommone", "cabinato", "open", "fisherman", "gozzo",
  "deriva", "crociera", "motoscafo", "natante",
  "barca", "vela", "motore", "usato nautica",
  "bavaria", "beneteau", "jeanneau", "elan", "hanse",
  "azimut", "sessa", "cranchi", "rio", "fiart",
];

function buildQueries(): { query: string; site: string }[] {
  const queries: { query: string; site: string }[] = [];

  // Brand-scoped queries for each site
  for (const brand of SAILBOAT_BRANDS) {
    queries.push({ query: `${brand} site:boat24.com`, site: "boat24.com" });
    queries.push({ query: `${brand} site:mornar.net`, site: "mornar.net" });
    queries.push({ query: `${brand} site:subito.it nautica`, site: "subito.it" });
  }
  for (const brand of POWERBOAT_BRANDS) {
    queries.push({ query: `${brand} site:boat24.com`, site: "boat24.com" });
    queries.push({ query: `${brand} site:mornar.net`, site: "mornar.net" });
    queries.push({ query: `${brand} site:subito.it nautica`, site: "subito.it" });
  }

  // Generic queries
  for (const term of BOAT24_GENERIC) {
    queries.push({ query: `${term} site:boat24.com`, site: "boat24.com" });
  }
  for (const term of MORNAR_GENERIC) {
    queries.push({ query: `${term} site:mornar.net`, site: "mornar.net" });
  }
  for (const term of SUBITO_GENERIC) {
    queries.push({ query: `${term} site:subito.it`, site: "subito.it" });
  }

  return queries;
}

const ALL_QUERIES = buildQueries();

// Strict URL validation per site
function isValidListingUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Must be from allowed domains
  let hostname = "";
  try { hostname = new URL(url).hostname.replace("www.", "").replace("www2.", ""); } catch { return false; }
  if (!ALLOWED_DOMAINS.some(d => hostname.includes(d))) return false;

  // Site-specific listing URL patterns
  if (hostname.includes("boat24.com")) {
    // boat24 listings: /detail/NNNNNN/ or /en/sailboats/brand/model/detail/NNNNNN/
    return /\/detail\/\d+/i.test(url);
  }
  if (hostname.includes("mornar.net")) {
    // mornar listings: /Show/boat.asp?ID=NNNNNN
    return /\/[Ss]how\/boat\.asp\?/i.test(url) && /ID=\d+/i.test(url);
  }
  if (hostname.includes("subito.it")) {
    // subito listings: individual ads with numeric IDs, NOT category pages
    // Valid: /annuncio/barca-a-vela-12345.htm or similar
    // Invalid: /annunci-barche/vendita/ (search page)
    if (/\/annunci[/-]/i.test(urlLower) && !/\.htm/i.test(urlLower)) return false;
    // Must have a numeric ID
    return /\d{5,}/.test(url) && !/\/annunci-\w+\/vendita\//i.test(urlLower);
  }
  
  return false;
}

const SAILBOAT_KEYWORDS = [
  "sailboat", "sailing", "sloop", "ketch", "cutter", "catamaran", "trimaran",
  "jedrilica", "barca a vela", "segelboot", "voilier", "velero",
  "oceanis", "sun odyssey", "hanse ", "dehler", "hallberg", "bavaria cruiser",
  "dufour", "elan impression", "grand soleil", "najad", "x-yachts",
  "catalina", "hunter ", "lagoon", "fountaine pajot", "nautitech",
  "oyster", "contest", "swan ", "feeling", "moody", "deriva", "vela",
];
const POWERBOAT_KEYWORDS = [
  "powerboat", "motorboat", "motor yacht", "flybridge", "express cruiser",
  "center console", "cabin cruiser", "sport boat", "gliser", "motorna",
  "motorboot", "barca a motore", "bateau moteur", "motoscafo",
  "antares", "merry fisher", "cap camarat", "fairline", "princess v",
  "azimut", "sunseeker", "cranchi", "sessa", "quicksilver", "nimbus",
  "galeon", "sea ray", "boston whaler", "prestige", "absolute", "saxdor", "axopar",
  "gommone", "cabinato", "open", "fisherman", "gozzo", "natante",
  "ferretti", "riva", "pershing",
];

function parseListingFromSearch(item: any, querySite: string): any | null {
  if (!item.url) return null;
  if (!isValidListingUrl(item.url)) return null;

  const text = `${item.title || ""} ${item.description || ""}`;
  const textLower = text.toLowerCase();

  // Detect boat type
  const isSail = SAILBOAT_KEYWORDS.some(k => textLower.includes(k));
  const isPower = POWERBOAT_KEYWORDS.some(k => textLower.includes(k));
  let boatType = "sailboat";
  if (isPower && !isSail) boatType = "powerboat";
  else if (isSail && !isPower) boatType = "sailboat";
  else if (isPower && isSail) boatType = "sailboat"; // ambiguous defaults to sailboat

  // Reject category/search page titles
  const titleLower = (item.title || "").toLowerCase();
  const categoryPhrases = [
    "boats for sale", "yachts for sale", "for sale in", "find your",
    "browse", "search results", "listings", "used boats",
    "new and used", "buy and sell", "marketplace", "annunci",
    "risultati", "cerca", "ricerca",
  ];
  if (categoryPhrases.some(p => titleLower.includes(p)) && !titleLower.match(/\d{4}/)) return null;

  // Parse price
  let price: number | null = null;
  const eurMatch = text.match(/€\s*([\d.,\s]+)/i) || text.match(/([\d.,\s]+)\s*€/i) || text.match(/EUR\s*([\d.,\s]+)/i);
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

  // Must have price to be shown (user requirement)
  if (!price) return null;

  const locations = text.match(/(?:in|at|located?\s+in|port|marina|,)\s+([A-Z][a-záéíóúàèìòùäëïöüçñ]+(?:\s+[A-Z][a-záéíóúàèìòùäëïöüçñ]+){0,2})/g);
  let location: string | null = null;
  if (locations && locations.length > 0) {
    location = locations[0].replace(/^(?:in|at|located?\s+in|port|marina|,)\s+/i, "").trim();
  }

  let source = "";
  try { source = new URL(item.url).hostname.replace("www.", "").replace("www2.", ""); } catch {}

  let engineInfo: string | null = null;
  const engineMatch = text.match(/(?:engine|motor|hp|cv|kw|ps)[:\s]*([^,.]{5,50})/i);
  if (engineMatch) engineInfo = engineMatch[1].trim().substring(0, 200);

  const description: string | null = item.description?.substring(0, 500) || null;

  // Image: require it from search result
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
    let endIdx = ALL_QUERIES.length;
    let skipEnrich = false;
    let enrichCount = 15;
    try {
      const body = await req.json();
      if (body.startIdx !== undefined) startIdx = body.startIdx;
      if (body.endIdx !== undefined) endIdx = body.endIdx;
      if (body.skipEnrich) skipEnrich = true;
      if (body.enrichCount) enrichCount = body.enrichCount;
    } catch {}

    const queries = ALL_QUERIES.slice(startIdx, endIdx);
    console.log(`Starting scrape: queries ${startIdx}-${endIdx} (${queries.length} queries, total available: ${ALL_QUERIES.length})...`);

    // Phase 1: Search
    const BATCH_SIZE = 5;
    const allListings: any[] = [];

    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      console.log(`Search batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(queries.length / BATCH_SIZE)}`);

      const results = await Promise.all(batch.map(async (q) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: q.query, limit: 20 }),
          });
          if (!res.ok) {
            console.error(`Search failed for "${q.query}": ${res.status}`);
            return [];
          }
          const data = await res.json();
          return (data?.data || []).map((item: any) => parseListingFromSearch(item, q.site)).filter(Boolean);
        } catch (e) {
          console.error(`Error searching "${q.query}":`, e);
          return [];
        }
      }));

      allListings.push(...results.flat());

      if (i + BATCH_SIZE < queries.length) {
        await new Promise(r => setTimeout(r, 400));
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

    // Phase 2: Enrich listings without images
    const needsEnrich = uniqueListings.filter(l => !l.image_url);
    const toEnrich = skipEnrich ? [] : needsEnrich.slice(0, enrichCount);
    console.log(`Phase 2: Enriching ${toEnrich.length}/${needsEnrich.length} without images${skipEnrich ? " (skipped)" : ""}...`);

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
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (!res.ok) return;
          const data = await res.json();
          const md = data?.data?.markdown || "";

          // Extract images from markdown
          const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
          const imgs: string[] = [];
          let m;
          while ((m = imgRegex.exec(md)) !== null) {
            const imgUrl = m[1];
            if (!imgUrl.includes("logo") && !imgUrl.includes("icon") && !imgUrl.includes("banner") && !imgUrl.includes("favicon")) {
              imgs.push(imgUrl);
            }
          }
          // Also try <img src="..."> tags
          const imgTagRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
          while ((m = imgTagRegex.exec(md)) !== null) {
            const imgUrl = m[1];
            if (!imgUrl.includes("logo") && !imgUrl.includes("icon") && !imgUrl.includes("banner")) {
              imgs.push(imgUrl);
            }
          }

          if (imgs.length > 0) {
            listing.image_url = imgs[0];
            listing.image_urls = [...new Set(imgs)].slice(0, 10);
          }

          // Try to extract more details from markdown
          const priceMatch = md.match(/€\s*([\d.,\s]+)/i) || md.match(/([\d.,\s]+)\s*€/i) || md.match(/EUR\s*([\d.,\s]+)/i);
          if (priceMatch && !listing.price_eur) {
            const raw = priceMatch[1].replace(/\s/g, "");
            let p: number;
            if (raw.includes(",") && raw.includes(".")) {
              p = parseFloat(raw.replace(/\./g, "").replace(",", "."));
            } else {
              p = parseFloat(raw.replace(",", "."));
            }
            if (p > 500 && p < 50000000) listing.price_eur = p;
          }

          if (!listing.location) {
            const locMatch = md.match(/(?:location|porto|luogo|standort|lokacija)[:\s]*([^\n]{3,50})/i);
            if (locMatch) listing.location = locMatch[1].trim().substring(0, 100);
          }

          if (!listing.description) {
            const descLines = md.split("\n").filter(l => l.length > 30 && l.length < 500 && !l.startsWith("#") && !l.startsWith("|"));
            if (descLines.length > 0) listing.description = descLines.slice(0, 3).join(" ").substring(0, 500);
          }
        } catch (e) {
          console.error(`Enrich failed for ${listing.url}:`, e);
        }
      }));

      if (i + ENRICH_BATCH < toEnrich.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Final filter: only upsert listings WITH images
    const withImages = uniqueListings.filter(l => l.image_url);
    console.log(`Phase 2 done. ${withImages.length}/${uniqueListings.length} have images. Upserting...`);

    // Upsert in chunks
    const CHUNK = 50;
    let upserted = 0;
    for (let i = 0; i < withImages.length; i += CHUNK) {
      const chunk = withImages.slice(i, i + CHUNK);
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

    console.log(`Done! ${upserted} listings upserted (with images only).`);

    return new Response(JSON.stringify({
      success: true,
      total: allListings.length,
      unique: uniqueListings.length,
      withImages: withImages.length,
      enriched: toEnrich.length,
      upserted,
      queryRange: `${startIdx}-${endIdx}`,
      totalQueries: ALL_QUERIES.length,
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

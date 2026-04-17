
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_DOMAINS = [
  "boat24.com", "mornar.net", "subito.it",
  "yachtall.com", "scanboat.com", "2yachts.com",
  "theyachtmarket.com", "devalk.nl", "yachtworld.com",
  "rightboat.com", "bandofboats.com",
];

// ===== SEARCH QUERIES - site scoped =====
const SEARCH_QUERIES: { query: string; site: string }[] = [];

// Brands for boat24, mornar, yachtall, scanboat, 2yachts, theyachtmarket
const BRANDS = [
  "Bavaria 32", "Bavaria 34", "Bavaria 37", "Bavaria 40", "Bavaria 46", "Bavaria 50", "Bavaria Cruiser 41",
  "Beneteau Oceanis 31", "Beneteau Oceanis 35", "Beneteau Oceanis 38", "Beneteau Oceanis 41",
  "Beneteau Oceanis 43", "Beneteau Oceanis 46", "Beneteau Oceanis 51",
  "Beneteau First 35", "Beneteau First 40",
  "Jeanneau Sun Odyssey 32", "Jeanneau Sun Odyssey 36", "Jeanneau Sun Odyssey 39",
  "Jeanneau Sun Odyssey 42", "Jeanneau Sun Odyssey 45", "Jeanneau Sun Odyssey 49",
  "Hanse 315", "Hanse 345", "Hanse 385", "Hanse 415", "Hanse 455", "Hanse 505",
  "Dufour 360", "Dufour 382", "Dufour 412", "Dufour 460", "Dufour 530",
  "Elan 340", "Elan 350", "Elan 444", "Elan Impression 40", "Elan Impression 45", "Elan Impression 50",
  "Dehler 34", "Dehler 38", "Dehler 41",
  "Hallberg-Rassy 34", "Hallberg-Rassy 40", "Hallberg-Rassy 42",
  "Lagoon 380", "Lagoon 42", "Lagoon 450", "Lagoon 46", "Lagoon 50",
  "Fountaine Pajot Lucia 40", "Fountaine Pajot Saona 47",
  "Grand Soleil 39", "Grand Soleil 43", "Grand Soleil 46",
  "X-Yachts X4", "Salona 41", "Salona 44",
  "Azimut 42", "Azimut 50", "Azimut 55", "Azimut 60",
  "Fairline Targa 38", "Fairline Squadron 50",
  "Princess V39", "Princess V50", "Princess F45",
  "Sessa C35", "Sessa C38", "Sessa Marine Key Largo",
  "Cranchi Z35", "Cranchi Endurance 39",
  "Galeon 325", "Galeon 430", "Galeon 470",
  "Prestige 420", "Prestige 460", "Prestige 520",
  "Quicksilver 755", "Quicksilver Activ 605",
  "Nimbus 305", "Nimbus 365",
  "Axopar 28", "Axopar 37", "Saxdor 320", "Saxdor 270",
  "Sea Ray 320", "Sea Ray 350", "Sea Ray Sundancer 400",
  "Parker 850", "Parker 750",
  "Bayliner Element", "Sunseeker Manhattan 50",
];

const BRAND_SITES = ["boat24.com", "mornar.net", "yachtall.com", "scanboat.com", "2yachts.com", "theyachtmarket.com"];
for (const brand of BRANDS) {
  for (const site of BRAND_SITES) {
    SEARCH_QUERIES.push({ query: `${brand} site:${site}`, site });
  }
}

// Generic terms per site
const BOAT24_TERMS = [
  "segelboot", "motorboot", "segelyacht", "motoryacht", "katamaran",
  "segelboot Kroatien", "segelboot Italien", "segelboot Griechenland",
  "segelboot Slowenien", "motorboot Kroatien", "motorboot Italien",
  "segelboot Adria", "motorboot Adria", "kajütboot", "gebrauchte yacht",
  "barca a vela", "barca a motore", "sailboat", "powerboat",
  "yacht under 50000", "yacht under 30000", "yacht under 100000",
  "yacht under 20000", "yacht under 80000",
  "sailing yacht Croatia", "sailing yacht Italy", "sailing yacht Greece",
  "sailing yacht Turkey", "sailing yacht Spain",
  "motor yacht Croatia", "motor yacht Italy",
  "Bavaria sailboat", "Beneteau sailboat", "Jeanneau sailboat",
  "Hanse sailboat", "Elan sailboat", "Dufour sailboat",
];
const MORNAR_TERMS = [
  "jedrilica", "motorna brodica", "gliser", "jahta", "katamaran",
  "jedrilica Hrvatska", "jedrilica Slovenija", "brod na prodaju",
  "sailboat Croatia", "sailboat Slovenia", "sailboat Adriatic",
  "powerboat Croatia", "boat for sale Croatia", "yacht Adriatic",
  "bavaria", "beneteau", "jeanneau", "elan", "hanse", "lagoon",
  "azimut", "sessa", "fairline", "princess", "dufour",
];
const SUBITO_TERMS = [
  "barca a vela", "barca a motore", "yacht nautica", "catamarano nautica",
  "barca vela Liguria", "barca vela Sardegna", "barca vela Sicilia",
  "barca vela Toscana", "barca vela Campania", "barca vela Puglia",
  "barca motore Liguria", "barca motore Sardegna", "barca motore Sicilia",
  "barca motore Toscana", "barca motore Campania",
  "barca vela Lazio", "barca vela Veneto", "barca vela Calabria",
  "barca motore Lazio", "barca motore Veneto",
  "cabinato nautica", "gommone nautica", "gozzo nautica",
  "Bavaria nautica", "Beneteau nautica", "Jeanneau nautica",
  "Azimut nautica", "Sessa nautica", "Cranchi nautica",
  "barca usata", "vela usata", "motore usato nautica",
];

for (const t of BOAT24_TERMS) SEARCH_QUERIES.push({ query: `${t} site:boat24.com`, site: "boat24.com" });
for (const t of MORNAR_TERMS) SEARCH_QUERIES.push({ query: `${t} site:mornar.net`, site: "mornar.net" });
for (const t of SUBITO_TERMS) SEARCH_QUERIES.push({ query: `${t} site:subito.it`, site: "subito.it" });

// Yachtall (German, big EU inventory)
const YACHTALL_TERMS = [
  "segelboot", "motorboot", "segelyacht", "katamaran",
  "sailboat", "motor yacht", "yacht for sale",
  "Bavaria", "Beneteau", "Jeanneau", "Hanse", "Dufour", "Elan", "Dehler",
  "yacht Kroatien", "yacht Italien", "yacht Griechenland",
];
for (const t of YACHTALL_TERMS) SEARCH_QUERIES.push({ query: `${t} site:yachtall.com`, site: "yachtall.com" });

// Scanboat (Nordic, EU)
const SCANBOAT_TERMS = [
  "sailboat", "motorboat", "yacht", "catamaran",
  "Bavaria", "Beneteau", "Jeanneau", "Hanse", "Dufour", "Elan",
  "sailboat Mediterranean", "yacht Croatia", "yacht Greece",
];
for (const t of SCANBOAT_TERMS) SEARCH_QUERIES.push({ query: `${t} site:scanboat.com`, site: "scanboat.com" });

// 2yachts (EU listings)
const TWOYACHTS_TERMS = [
  "sailboat for sale", "motor yacht for sale", "catamaran for sale",
  "yacht Croatia", "yacht Italy", "yacht Greece", "yacht Spain", "yacht Turkey",
  "Bavaria", "Beneteau", "Jeanneau", "Hanse", "Dufour", "Lagoon", "Elan",
];
for (const t of TWOYACHTS_TERMS) SEARCH_QUERIES.push({ query: `${t} site:2yachts.com`, site: "2yachts.com" });

// theyachtmarket (UK/EU)
const TYM_TERMS = [
  "sailing yacht", "motor yacht", "catamaran",
  "yacht Mediterranean", "yacht Croatia", "yacht Italy", "yacht Greece",
  "Bavaria yacht", "Beneteau yacht", "Jeanneau yacht", "Hanse yacht",
];
for (const t of TYM_TERMS) SEARCH_QUERIES.push({ query: `${t} site:theyachtmarket.com`, site: "theyachtmarket.com" });

// De Valk (Netherlands, premium EU)
const DEVALK_TERMS = [
  "sailing yacht", "motor yacht", "Bavaria", "Beneteau", "Jeanneau", "Hanse",
];
for (const t of DEVALK_TERMS) SEARCH_QUERIES.push({ query: `${t} site:devalk.nl`, site: "devalk.nl" });

// Strict URL validation
function isValidListingUrl(url: string): boolean {
  let hostname = "";
  try { hostname = new URL(url).hostname.replace("www.", "").replace("www2.", ""); } catch { return false; }
  if (!ALLOWED_DOMAINS.some(d => hostname.includes(d))) return false;

  if (hostname.includes("boat24.com")) return /\/detail\/\d+/i.test(url);
  if (hostname.includes("mornar.net")) {
    return (/\/[Ss]how\/boat\.asp/i.test(url) && /ID=\d+/i.test(url)) || /\/oglas[a-z\-]*\/\d+/i.test(url);
  }
  if (hostname.includes("subito.it")) {
    if (!/\.htm/i.test(url)) return false;
    if (/\/annunci-\w+\/vendita\/[^/]+\/?$/i.test(url)) return false; // category page
    return /\d{6,}\.htm/i.test(url);
  }
  if (hostname.includes("yachtall.com")) {
    // Real listings: /en/boat/<slug>-s<id> or /de/boot/<slug>-s<id>
    return /\/(en|de)\/(boat|boot|boat-transport)\/[a-z0-9\-]+-s\d+/i.test(url);
  }
  if (hostname.includes("scanboat.com")) {
    // Only true detail pages (skip /video/ and /boat-market/boats?...)
    return /\/(en|de|da|sv|no)\/boat\/[a-z0-9\-]+\/\d+/i.test(url) || /\/(en|de|da|sv|no)\/used-boat\/[a-z0-9\-]+\/\d+/i.test(url);
  }
  if (hostname.includes("2yachts.com")) return /\/(yacht|boat)\/\d+/i.test(url) || /\/listing\/\d+/i.test(url);
  if (hostname.includes("theyachtmarket.com")) return /\/boats-for-sale\/[^/]+\/[^/]+\/\d+\//i.test(url);
  if (hostname.includes("devalk.nl")) return /\/yachtbrokerage\/\d{5,}\//i.test(url);
  if (hostname.includes("yachtworld.com")) return /\/yacht\/[^/]+\/\d{5,}/i.test(url) || /\/boats-for-sale\/[^/]+\/\d{5,}/i.test(url);
  if (hostname.includes("rightboat.com")) return /\/boats-for-sale\/[^/]+\/\d+/i.test(url);
  if (hostname.includes("bandofboats.com")) return /\/boat\/[^/]+\/\d+/i.test(url) || /\/used-boat\/\d+/i.test(url);
  return false;
}

const SAILBOAT_KW = ["sailboat","sailing yacht","sailing boat","sloop","ketch","cutter","catamaran","trimaran","jedrilica","barca a vela","segelboot","segelyacht","voilier","velero","oceanis","sun odyssey","hanse ","dehler","hallberg","bavaria cruiser","dufour","elan impression","grand soleil","najad","x-yachts","catalina","hunter ","lagoon","fountaine pajot","nautitech","oyster","contest","swan ","feeling","moody","deriva","vela","jedra","jedrenjak"];
const POWERBOAT_KW = ["powerboat","motorboat","motor yacht","motoryacht","flybridge","express cruiser","center console","cabin cruiser","sport boat","gliser","motorna","motorboot","motorboote","barca a motore","bateau moteur","motoscafo","antares","merry fisher","cap camarat","princess v","sunseeker","quicksilver","nimbus","galeon","sea ray","boston whaler","absolute","saxdor","axopar","gommone","cabinato","fisherman","gozzo","natante","riva ","pershing","flybridge","outboard","inboard","stern drive"];

// Brand-based detection (very high signal — these brands make ONLY powerboats or ONLY sailboats)
const POWERBOAT_BRANDS = ["azimut","ferretti","sunseeker","princess","fairline","cranchi","sessa","galeon","prestige","sea ray","bayliner","saxdor","axopar","nimbus","quicksilver","parker","boston whaler","pershing","riva","absolute","sealine","jeanneau merry fisher","jeanneau cap camarat","jeanneau leader","beneteau antares","beneteau gran turismo","beneteau flyer","beneteau swift trawler","beneteau monte carlo","fountaine pajot motor","lagoon sixty","linssen","sasga","nordhavn","pardo","invictus","fjord","wally"];
const SAILBOAT_BRANDS = ["beneteau oceanis","beneteau first","jeanneau sun odyssey","jeanneau sun fast","bavaria cruiser","bavaria c","hanse","dehler","dufour","elan impression","elan gt","hallberg-rassy","hallberg rassy","grand soleil","x-yachts","najad","contest yacht","oyster yacht","swan yacht","najad","amel","catana","outremer","lagoon 3","lagoon 4","lagoon 5","fountaine pajot lucia","fountaine pajot saona","fountaine pajot saba","fountaine pajot astrea","nautitech","leopard catamaran","seawind"];

// URL-based detection (most reliable — site categorizes the listing for us)
function detectBoatTypeFromUrl(url: string): "sailboat" | "powerboat" | null {
  const u = url.toLowerCase();
  // boat24.com path segments
  if (/\/(sailingboats|sailboats|segelboote|barcheavela|purjeveneet|sejlbade|jedrilice|voiliers|veleros)\//.test(u)) return "sailboat";
  if (/\/(powerboats|motorboats|motorboote|barcheamotore|motoryachts|motornaplovila|gliseri|moottoriveneet|motorbade)\//.test(u)) return "powerboat";
  // mornar.net often has type in slug
  if (/\/jedrilic[ae]\//.test(u)) return "sailboat";
  if (/\/(motorn[ae]|gliser)\//.test(u)) return "powerboat";
  return null;
}

function detectBoatType(text: string, url: string): "sailboat" | "powerboat" {
  // 1. URL is most reliable
  const fromUrl = detectBoatTypeFromUrl(url);
  if (fromUrl) return fromUrl;

  const t = text.toLowerCase();

  // 2. Brand-based (strong signal)
  if (POWERBOAT_BRANDS.some(b => t.includes(b))) return "powerboat";
  if (SAILBOAT_BRANDS.some(b => t.includes(b))) return "sailboat";

  // 3. Keyword-based
  const isSail = SAILBOAT_KW.some(k => t.includes(k));
  const isPower = POWERBOAT_KW.some(k => t.includes(k));
  if (isPower && !isSail) return "powerboat";
  if (isSail && !isPower) return "sailboat";

  // 4. Default to sailboat (majority of inventory)
  return "sailboat";
}

function parsePrice(text: string): number | null {
  const eurMatch = text.match(/€\s*([\d.,\s]+)/i) || text.match(/([\d.,\s]+)\s*€/i) || text.match(/EUR\s*([\d.,\s]+)/i);
  const usdMatch = text.match(/\$\s*([\d,.]+)/i) || text.match(/USD\s*([\d,.]+)/i);
  const gbpMatch = text.match(/£\s*([\d,.]+)/i) || text.match(/GBP\s*([\d,.]+)/i);

  let price: number | null = null;
  if (eurMatch) {
    const raw = eurMatch[1].replace(/\s/g, "");
    if (raw.includes(",") && raw.includes(".")) price = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    else if (raw.includes(",") && raw.split(",").pop()!.length === 3) price = parseFloat(raw.replace(/,/g, ""));
    else if (raw.includes(".") && raw.split(".").pop()!.length === 3) price = parseFloat(raw.replace(/\./g, ""));
    else price = parseFloat(raw.replace(",", "."));
  } else if (usdMatch) {
    price = Math.round(parseFloat(usdMatch[1].replace(/,/g, "")) * 0.92);
  } else if (gbpMatch) {
    price = Math.round(parseFloat(gbpMatch[1].replace(/,/g, "")) * 1.16);
  }
  return (price && price >= 500 && price <= 50000000) ? price : null;
}

function parseListing(item: any): any | null {
  if (!item.url || !isValidListingUrl(item.url)) return null;

  const text = `${item.title || ""} ${item.description || ""}`;
  const textLower = text.toLowerCase();

  // Category page rejection
  const titleLower = (item.title || "").toLowerCase();
  if (["boats for sale","yachts for sale","browse","search results","listings","marketplace","annunci","risultati","cerca"].some(p => titleLower.includes(p)) && !titleLower.match(/\d{4}/)) return null;

  const boatType = detectBoatType(text, item.url);

  const price = parsePrice(text);
  // boat24 always has price in title — strict gate keeps quality.
  // Other sites often hide price in body — let them through to enrichment, where price is extracted from page markdown. Final upsert filter still requires price+image.
  let source = "";
  try { source = new URL(item.url).hostname.replace("www.", "").replace("www2.", ""); } catch {}
  if (!price && source.includes("boat24.com")) return null;

  const yearMatch = text.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  let lengthFeet: number | null = null;
  const ftMatch = text.match(/([\d.]+)\s*(?:ft|feet|foot|')/i);
  const mMatch = text.match(/([\d.,]+)\s*m\b/i);
  if (ftMatch) lengthFeet = parseFloat(ftMatch[1]);
  else if (mMatch) lengthFeet = Math.round(parseFloat(mMatch[1].replace(",", ".")) * 3.281 * 10) / 10;
  if (lengthFeet && (lengthFeet < 10 || lengthFeet > 500)) lengthFeet = null;

  let engineInfo: string | null = null;
  const engineMatch = text.match(/(?:engine|motor|hp|cv|kw|ps)[:\s]*([^,.]{5,50})/i);
  if (engineMatch) engineInfo = engineMatch[1].trim().substring(0, 200);

  return {
    title: (item.title || "Unknown").substring(0, 200).replace(/\s*[-|].*$/, ""),
    url: item.url,
    boat_type: boatType,
    price_eur: price,
    year,
    length_feet: lengthFeet,
    location: null,
    image_url: item.image || null,
    image_urls: item.image ? [item.image] : null,
    engine_info: engineInfo,
    source,
    scraped_at: new Date().toISOString(),
    description: item.description?.substring(0, 500) || null,
    hull_material: null,
    engine_hours: null,
    cabins: null,
    fuel_type: null,
  };
}

async function enrichListing(listing: any, apiKey: string): Promise<void> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: listing.url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const md = data?.data?.markdown || "";

    // Extract images
    const imgs: string[] = [];
    const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = imgRegex.exec(md)) !== null) {
      if (!m[1].includes("logo") && !m[1].includes("icon") && !m[1].includes("favicon")) imgs.push(m[1]);
    }
    const imgTag = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    while ((m = imgTag.exec(md)) !== null) {
      if (!m[1].includes("logo") && !m[1].includes("icon")) imgs.push(m[1]);
    }
    // Also look for direct image URLs in markdown (common in boat24)
    const directImg = /https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)/gi;
    while ((m = directImg.exec(md)) !== null) {
      if (!m[0].includes("logo") && !m[0].includes("icon") && !m[0].includes("favicon")) imgs.push(m[0]);
    }

    const uniqueImgs = [...new Set(imgs)];
    if (uniqueImgs.length > 0) {
      listing.image_url = uniqueImgs[0];
      listing.image_urls = uniqueImgs.slice(0, 10);
    }

    // Extract price if missing
    if (!listing.price_eur) {
      const p = parsePrice(md);
      if (p) listing.price_eur = p;
    }

    // Extract location
    if (!listing.location) {
      const locMatch = md.match(/(?:location|porto|luogo|standort|lokacija|lage)[:\s]*([^\n]{3,50})/i);
      if (locMatch) listing.location = locMatch[1].trim().substring(0, 100);
    }

    // Description
    if (!listing.description) {
      const lines = md.split("\n").filter(l => l.length > 30 && l.length < 500 && !l.startsWith("#") && !l.startsWith("|"));
      if (lines.length > 0) listing.description = lines.slice(0, 3).join(" ").substring(0, 500);
    }

    // Re-detect boat_type with full markdown context (more accurate than search snippet)
    const fullText = `${listing.title || ""} ${listing.description || ""} ${md.substring(0, 5000)}`;
    listing.boat_type = detectBoatType(fullText, listing.url);
  } catch (e) {
    console.error(`Enrich failed for ${listing.url}:`, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let startIdx = 0;
    let endIdx = SEARCH_QUERIES.length;
    let skipEnrich = false;
    let enrichCount = 30;
    let mode = "search"; // "search" or "map"
    try {
      const body = await req.json();
      if (body.startIdx !== undefined) startIdx = body.startIdx;
      if (body.endIdx !== undefined) endIdx = body.endIdx;
      if (body.skipEnrich) skipEnrich = true;
      if (body.enrichCount) enrichCount = body.enrichCount;
      if (body.mode) mode = body.mode;
    } catch {}

    if (mode === "map") {
      // MAP mode: discover URLs from site sitemaps
      const sites = [
        { url: "https://www.boat24.com/en/sailboats/", search: "detail", site: "boat24.com" },
        { url: "https://www.boat24.com/en/powerboats/", search: "detail", site: "boat24.com" },
        { url: "https://www.mornar.net", search: "Show/boat", site: "mornar.net" },
        { url: "https://www.subito.it/annunci-italia/vendita/nautica/", search: "", site: "subito.it" },
      ];

      const allUrls: { url: string; site: string }[] = [];

      for (const s of sites) {
        console.log(`Mapping ${s.url}...`);
        try {
          const res = await fetch("https://api.firecrawl.dev/v2/map", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: s.url, search: s.search, limit: 5000, includeSubdomains: true }),
          });
          if (res.ok) {
            const data = await res.json();
            const urls = (data?.links || []).filter((u: string) => isValidListingUrl(u));
            console.log(`Found ${urls.length} listing URLs from ${s.url}`);
            urls.forEach((u: string) => allUrls.push({ url: u, site: s.site }));
          }
        } catch (e) { console.error(`Map error for ${s.url}:`, e); }
      }

      // Dedupe
      const seen = new Set<string>();
      const unique = allUrls.filter(u => { if (seen.has(u.url)) return false; seen.add(u.url); return true; });
      console.log(`Map found ${unique.length} unique listing URLs total`);

      // Create minimal listing records from URLs (will need enrichment later)
      const listings = unique.map(u => ({
        title: u.url.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Unknown",
        url: u.url,
        boat_type: "sailboat",
        price_eur: null,
        year: null,
        length_feet: null,
        location: null,
        image_url: null,
        image_urls: null,
        engine_info: null,
        source: u.site,
        scraped_at: new Date().toISOString(),
        description: null,
        hull_material: null,
        engine_hours: null,
        cabins: null,
        fuel_type: null,
      }));

      // Enrich a subset
      const toEnrich = listings.slice(startIdx, Math.min(startIdx + enrichCount, listings.length));
      console.log(`Enriching ${toEnrich.length} mapped listings...`);

      const BATCH = 5;
      for (let i = 0; i < toEnrich.length; i += BATCH) {
        await Promise.all(toEnrich.slice(i, i + BATCH).map(l => enrichListing(l, apiKey)));
        if (i + BATCH < toEnrich.length) await new Promise(r => setTimeout(r, 300));
      }

      // Only upsert those with images AND price
      const valid = toEnrich.filter(l => l.image_url && l.price_eur);
      console.log(`${valid.length}/${toEnrich.length} enriched listings have images+price`);

      const CHUNK = 50;
      let upserted = 0;
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        const resp = await fetch(`${supabaseUrl}/rest/v1/cached_listings?on_conflict=url`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey,
            "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(chunk),
        });
        if (resp.ok) upserted += chunk.length;
        else console.error(`Upsert error:`, await resp.text());
      }

      return new Response(JSON.stringify({ success: true, mode: "map", mappedUrls: unique.length, enriched: toEnrich.length, valid: valid.length, upserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEARCH mode (default)
    const queries = SEARCH_QUERIES.slice(startIdx, endIdx);
    console.log(`Search mode: queries ${startIdx}-${endIdx} (${queries.length} queries, total: ${SEARCH_QUERIES.length})...`);

    const BATCH_SIZE = 5;
    const allListings: any[] = [];

    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(queries.length / BATCH_SIZE)}`);

      const results = await Promise.all(batch.map(async (q) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: q.query, limit: 30 }),
          });
          if (!res.ok) {
            console.error(`Search API ${res.status} for "${q.query}"`);
            return [];
          }
          const data = await res.json();
          // v2 search returns { data: { web: [...] } }
          const items = data?.data?.web || data?.data || [];
          return (Array.isArray(items) ? items : []).map((item: any) => parseListing(item)).filter(Boolean);
        } catch (e) { console.error(`Search error:`, e); return []; }
      }));

      allListings.push(...results.flat());
      if (i + BATCH_SIZE < queries.length) await new Promise(r => setTimeout(r, 400));
    }

    const seen = new Set<string>();
    const uniqueListings = allListings.filter((l: any) => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });

    console.log(`Search done: ${allListings.length} raw, ${uniqueListings.length} unique`);

    // Enrich those without images OR without price (non-boat24 listings often need enrichment for price)
    const needsEnrich = uniqueListings.filter(l => !l.image_url || !l.price_eur);
    const toEnrich = skipEnrich ? [] : needsEnrich.slice(0, enrichCount);
    console.log(`Enriching ${toEnrich.length}/${needsEnrich.length} listings (missing image or price)...`);

    const ENRICH_BATCH = 5;
    for (let i = 0; i < toEnrich.length; i += ENRICH_BATCH) {
      await Promise.all(toEnrich.slice(i, i + ENRICH_BATCH).map(l => enrichListing(l, apiKey)));
      if (i + ENRICH_BATCH < toEnrich.length) await new Promise(r => setTimeout(r, 300));
    }

    // STRICT quality gate: must have BOTH image AND price
    const valid = uniqueListings.filter(l => l.image_url && l.price_eur);
    console.log(`${valid.length}/${uniqueListings.length} have image+price. Upserting...`);

    const CHUNK = 50;
    let upserted = 0;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const resp = await fetch(`${supabaseUrl}/rest/v1/cached_listings?on_conflict=url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey,
          "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(chunk),
      });
      if (resp.ok) upserted += chunk.length;
      else console.error(`Upsert error:`, await resp.text());
    }

    return new Response(JSON.stringify({
      success: true, mode: "search", total: allListings.length, unique: uniqueListings.length,
      valid: valid.length, enriched: toEnrich.length, upserted,
      queryRange: `${startIdx}-${endIdx}`, totalQueries: SEARCH_QUERIES.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

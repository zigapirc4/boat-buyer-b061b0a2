// Firecrawl-free scraper. Mirrors the rules of `scrape-listings-cron` (same sources,
// same URL validation, same boat-type detection) but uses direct HTTP fetch + r.jina.ai
// fallback instead of Firecrawl, so it costs zero credits and can run frequently.
//
// Sources covered: mornar.net (sail+power), trovobarche.it (sail+power), boat24.com (sail+power), scanboat.com (sail+power),
// blocket.se, findaly.co, yachtall.com, nautano.com.
// Pagination matches the existing CATEGORY_PAGES config.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAYWRIGHT_WS_ENDPOINT =
  Deno.env.get("PLAYWRIGHT_WS_ENDPOINT") ||
  Deno.env.get("BROWSERLESS_WS_ENDPOINT") ||
  Deno.env.get("PLAYWRIGHT_CDP_URL") ||
  "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

type SailboatSegment =
  | "cruiser"
  | "performance_cruiser"
  | "racing"
  | "catamaran"
  | "luxury_cruiser";
type MotorboatSegment =
  | "motor_cruiser"
  | "flybridge"
  | "sport_boat"
  | "tender"
  | "rib"
  | "luxury_yacht";
type BoatSegment = SailboatSegment | MotorboatSegment;

// ---------- Sources (same rules as scrape-listings-cron CATEGORY_PAGES) ----------

type CategoryPage = {
  site: string;
  buildUrl: (page: number) => string;
  boatType: "sailboat" | "powerboat" | "auto";
  pages: number;
  titleFilter?: (title: string) => boolean;
};

type SiteProfile = {
  site: string;
  preferPlaywright: boolean;
  imageStrategy: "structured_first" | "gallery_first";
  equipmentStrategy: "strict" | "balanced";
};

const SITE_PROFILES: Record<string, SiteProfile> = {
  "mornar.net": { site: "mornar.net", preferPlaywright: false, imageStrategy: "structured_first", equipmentStrategy: "balanced" },
  "trovobarche.it": {
    site: "trovobarche.it",
    preferPlaywright: false,
    imageStrategy: "gallery_first",
    equipmentStrategy: "balanced",
  },
  "boat24.com": { site: "boat24.com", preferPlaywright: true, imageStrategy: "structured_first", equipmentStrategy: "strict" },
  "scanboat.com": { site: "scanboat.com", preferPlaywright: false, imageStrategy: "structured_first", equipmentStrategy: "strict" },
  "yachtall.com": { site: "yachtall.com", preferPlaywright: true, imageStrategy: "gallery_first", equipmentStrategy: "strict" },
  "nautano.com": { site: "nautano.com", preferPlaywright: true, imageStrategy: "gallery_first", equipmentStrategy: "balanced" },
};

function getSiteProfile(site: string): SiteProfile {
  return (
    SITE_PROFILES[site] || {
      site,
      preferPlaywright: false,
      imageStrategy: "structured_first",
      equipmentStrategy: "balanced",
    }
  );
}

const CATEGORY_PAGES: CategoryPage[] = [
  {
    site: "mornar.net",
    buildUrl: (page) => `https://www.mornar.net/Show/results.asp?boatmake=&rubrika=2&stran=${page}`,
    boatType: "sailboat",
    pages: 8,
  },
  {
    site: "mornar.net",
    buildUrl: (page) => `https://www.mornar.net/Show/results.asp?boatmake=&rubrika=1&stran=${page}`,
    boatType: "powerboat",
    pages: 8,
  },
  {
    site: "trovobarche.it",
    // Sailboats: category 202, sorted by newest. Pages 1..N
    buildUrl: (page) =>
      `https://www.trovobarche.it/en/used-boats/sailboats-202?o=date-d&page=${page}`,
    boatType: "sailboat",
    pages: 30,
  },
  {
    site: "trovobarche.it",
    // Motor boats: category 203, sorted by newest.
    buildUrl: (page) =>
      `https://www.trovobarche.it/en/used-boats/motor-boats-203?o=date-d&page=${page}`,
    boatType: "powerboat",
    pages: 30,
  },
  {
    site: "boat24.com",
    // boat24 uses offset pagination: page 2 = ?page=20, page 3 = ?page=40, page 8 = ?page=140
    buildUrl: (page) =>
      page === 1
        ? `https://www.boat24.com/en/usedboats/?cat=1&sort=datdesc`
        : `https://www.boat24.com/en/usedboats/?cat=1&sort=datdesc?page=${(page - 1) * 20}`,
    boatType: "sailboat",
    pages: 30,
  },
  {
    site: "boat24.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.boat24.com/en/usedboats/?cat=2&sort=datdesc`
        : `https://www.boat24.com/en/usedboats/?cat=2&sort=datdesc?page=${(page - 1) * 20}`,
    boatType: "powerboat",
    pages: 30,
  },
  {
    site: "scanboat.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.scanboat.com/en/boat-market/boats?SearchCriteria.BoatClassification=sail&SearchCriteria.ExtendedSearch=false&SearchCriteria.Searched=true`
        : `https://www.scanboat.com/en/boat-market/boats?SearchCriteria.BoatClassification=sail&SearchCriteria.ExtendedSearch=false&SearchCriteria.Searched=true&page=${page}`,
    boatType: "sailboat",
    pages: 30,
  },
  {
    site: "scanboat.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.scanboat.com/en/boat-market/boats?SearchCriteria.BoatTypeID=2&SearchCriteria.CountryIds=&SearchCriteria.ExtendedSearch=false&SearchCriteria.LengthWidthUnitID=1&SearchCriteria.Searched=true&SearchCriteria.SimilarSearch=false&SortBy=Year`
        : `https://www.scanboat.com/en/boat-market/boats?SearchCriteria.BoatTypeID=2&SearchCriteria.CountryIds=&SearchCriteria.ExtendedSearch=false&SearchCriteria.LengthWidthUnitID=1&SearchCriteria.Searched=true&SearchCriteria.SimilarSearch=false&SortBy=Year&page=${page}`,
    boatType: "powerboat",
    pages: 30,
  },
  {
    site: "yachtall.com",
    buildUrl: (page) =>
      page === 1 ? `https://www.yachtall.com/en/sailboats` : `https://www.yachtall.com/en/sailboats?page=${page}`,
    boatType: "sailboat",
    pages: 20,
  },
  {
    site: "yachtall.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.yachtall.com/en/motorboats`
        : `https://www.yachtall.com/en/motorboats?page=${page}`,
    boatType: "powerboat",
    pages: 20,
  },
  {
    site: "nautano.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.nautano.com/en/sailboats/`
        : `https://www.nautano.com/en/sailboats/?page=${page}`,
    boatType: "sailboat",
    pages: 20,
  },
  {
    site: "nautano.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.nautano.com/en/motorboats/`
        : `https://www.nautano.com/en/motorboats/?page=${page}`,
    boatType: "powerboat",
    pages: 20,
  },
];

// ---------- URL validation (mirror of scrape-listings-cron) ----------

function isValidListingUrl(url: string, site: string): boolean {
  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace("www.", "").replace("www2.", "");
  } catch {
    return false;
  }
  if (!hostname.includes(site)) return false;

  if (hostname.includes("boat24.com")) return /\/detail\/\d+/i.test(url);
  if (hostname.includes("boatshop24")) {
    return /\/boat\/[a-z0-9-]+-\d{5,}(?:[/?#]|$)/i.test(url);
  }
  if (hostname.includes("mornar.net")) {
    return (/\/[Ss]how\/boat\.asp/i.test(url) && /ID=\d+/i.test(url)) || /\/oglas[a-z\-]*\/\d+/i.test(url);
  }
  if (hostname.includes("trovobarche.it")) {
    // Listing detail URLs look like: https://www.trovobarche.it/en/<slug>-classified-<id>
    return /\/en\/[a-z0-9][a-z0-9-]*-classified-\d{4,}(?:[\/?#]|$)/i.test(url);
  }
  if (hostname.includes("scanboat.com")) {
    // Listing detail URLs look like:
    // https://www.scanboat.com/en/boat-market/boats/sailingboat-<slug>-<id>
    // https://www.scanboat.com/en/boat-market/boats/motorboat-<slug>-<id>
    return /\/en\/boat-market\/boats\/(?:sailingboat|motorboat|motorsailer)-[a-z0-9-]+-\d{5,}(?:[\/?#]|$)/i.test(url);
  }
  if (hostname.includes("blocket.se")) {
    return /\/mobility\/item\/\d{6,}(?:[/?#]|$)/i.test(url);
  }
  if (hostname.includes("findaly.co")) {
    const m = url.match(/\/buy\/([a-z0-9-]+)(?:[/?#]|$)/i);
    if (!m?.[1]) return false;
    const slug = m[1].toLowerCase();
    if (
      [
        "sailboats",
        "motorboats",
        "motor-yachts",
        "catamarans",
        "boats",
        "yachts",
        "buy",
      ].includes(slug)
    ) {
      return false;
    }
    return true;
  }
  if (hostname.includes("yachtall.com")) {
    return /\/en\/boat\/[a-z0-9-]+-s\d{4,}(?:[/?#]|$)/i.test(url);
  }
  if (hostname.includes("nautano.com")) {
    return /\/en\/ship\/[a-z0-9-]{8,}(?:[/?#]|$)/i.test(url);
  }
  return false;
}

// ---------- Parsing helpers (same as scrape-boat-listing) ----------

const FX_TO_EUR: Record<string, number> = {
  EUR: 1,
  GBP: 1.17,
  USD: 0.92,
  CHF: 1.04,
  NOK: 0.087,
  SEK: 0.088,
  DKK: 0.134,
  HRK: 0.133,
  AUD: 0.61,
  CAD: 0.68,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s: string): string {
  return decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function parsePriceWithCurrency(text: string): { eur: number | null } {
  if (!text) return { eur: null };
  const patterns: { re: RegExp; cur: string }[] = [
    { re: /€\s*([\d.,\s]{3,})/i, cur: "EUR" },
    { re: /EUR\s*([\d.,\s]{3,})/i, cur: "EUR" },
    { re: /([\d.,\s]{3,})\s*€/i, cur: "EUR" },
    { re: /([\d.,\s]{3,})\s*EUR/i, cur: "EUR" },
    { re: /£\s*([\d.,\s]{3,})/i, cur: "GBP" },
    { re: /\$\s*([\d.,\s]{3,})/i, cur: "USD" },
    { re: /CHF\s*([\d.,\s]{3,})/i, cur: "CHF" },
    { re: /SEK\s*([\d.,\s]{3,})/i, cur: "SEK" },
    { re: /NOK\s*([\d.,\s]{3,})/i, cur: "NOK" },
    { re: /DKK\s*([\d.,\s]{3,})/i, cur: "DKK" },
    { re: /([\d.,\s]{3,})\s*kr\b/i, cur: "SEK" },
  ];
  for (const { re, cur } of patterns) {
    const m = text.match(re);
    if (m) {
      const raw = m[1].replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
      const num = parseFloat(raw.replace(",", "."));
      if (num > 500 && num < 50_000_000) {
        return { eur: Math.round(num * (FX_TO_EUR[cur] ?? 1)) };
      }
    }
  }
  return { eur: null };
}

function parseLengthFeet(text: string): number | null {
  if (!text) return null;
  const m = text.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*(m|meter|metres|metri|metrov|metara)\b/i);
  if (m) {
    const meters = parseFloat(m[1].replace(",", "."));
    if (meters > 3 && meters < 50) return Math.round(meters * 3.281 * 10) / 10;
  }
  const f = text.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(ft|feet|foot|fot)\b/i);
  if (f) {
    const ft = parseFloat(f[1].replace(",", "."));
    if (ft > 10 && ft < 200) return Math.round(ft * 10) / 10;
  }
  return null;
}

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
  const value = Number.parseFloat(normalized.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

const DECIMAL_NUMBER_RE = /(\d{1,2}(?:[.,]\d{1,2})?)/;

const METER_LENGTH_KEY_RE =
  /\b(length|overall length|length overall|loa|lunghezza|lung\.|longueur|dužina|duzina|dolžina|dolzina|eslora|longitud|länge|laenge)\b/i;
const METRIC_UNIT_RE = /\b(m|meter|meters|metre|metres|metri|metrov|metara)\b/i;
const IMPERIAL_UNIT_RE = /\b(ft|feet|foot)\b/i;

function parseLengthFromFeatureMap(featureMap: Record<string, string>): number | null {
  // Avoid building intermediate arrays on every listing parse.
  for (const [key, rawValue] of Object.entries(featureMap)) {
    if (!METER_LENGTH_KEY_RE.test(key) || !rawValue) continue;

    // Handles values like "11,98 m" / "39 ft" directly in the value.
    const parsedByText = parseLengthFeet(rawValue);
    if (parsedByText !== null) return parsedByText;

    // Some listings split unit into the key (e.g., "Length (m)") and numeric value.
    const plainNumber = rawValue.match(DECIMAL_NUMBER_RE);
    if (!plainNumber) continue;

    const value = Number.parseFloat(plainNumber[1].replace(",", "."));
    if (!Number.isFinite(value)) continue;

    const keyAndValue = `${key} ${rawValue}`;
    if (METRIC_UNIT_RE.test(keyAndValue)) {
      if (value > 3 && value < 50) return Math.round(value * 3.281 * 10) / 10;
      continue;
    }
    if (IMPERIAL_UNIT_RE.test(keyAndValue)) {
      if (value >= 10 && value < 200) return Math.round(value * 10) / 10;
      continue;
    }
  }

  return null;
}

function parseLengthFromLabeledText(text: string): number | null {
  if (!text) return null;
  // Handles patterns like "Length (m) 8.40" or "Length (ft) 30".
  const labeled = text.match(
    /(?:length|overall length|length overall|loa|lunghezza|longueur|dužina|duzina|dolžina|dolzina|eslora|longitud|länge|laenge)\s*(?:\((m|meter|meters|metre|metres|metri|metrov|metara|ft|feet|foot)\))?\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{1,2})?)/i,
  );
  if (!labeled) return null;

  const unit = (labeled[1] || "").toLowerCase();
  const value = Number.parseFloat(labeled[2].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  if (unit && METRIC_UNIT_RE.test(unit)) {
    if (value > 3 && value < 50) return Math.round(value * 3.281 * 10) / 10;
    return null;
  }
  if (unit && IMPERIAL_UNIT_RE.test(unit)) {
    if (value >= 10 && value < 200) return Math.round(value * 10) / 10;
    return null;
  }

  // If no explicit unit is present, do not guess.
  return null;
}

function parseYear(text: string): number | null {
  if (!text) return null;
  const keyed = text.match(/(?:year|year built|built|baujahr|année|anno|godina|leto)[\s:]+(\d{4})/i);
  if (keyed) {
    const y = parseInt(keyed[1]);
    if (y >= 1950 && y <= new Date().getFullYear() + 1) return y;
  }
  const all = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/g);
  if (all && all.length > 0) return parseInt(all[0]);
  return null;
}

function parseEngineHoursFromText(text: string): number | null {
  if (!text) return null;
  const afterLabel = text.match(/(?:engine\s*hours|ore\s*moto|radnih\s*sati|stunden|motostunden)\s*[:\-]?\s*(\d{1,5})/i);
  const beforeLabel = text.match(/(\d{1,5})\s*(?:engine\s*hours|hours|h\b|ore\s*moto|radnih\s*sati|stunden|motostunden)/i);
  const raw = afterLabel?.[1] || beforeLabel?.[1];
  if (!raw) return null;
  const val = Number.parseInt(raw, 10);
  if (!Number.isFinite(val) || val < 0 || val > 60000) return null;
  return val;
}

function parseCabinsFromText(text: string): number | null {
  if (!text) return null;
  const m = text.match(
    /(?:cabins?|cabine?|kabine?|number of cabins?|n[o°]\.?\s*of cabins?)\s*[:\-]?\s*(\d{1,2})/i,
  );
  if (!m) {
    // Listings sometimes phrase this as "version 4 cabins ...".
    const inline = text.match(/\b(\d{1,2})\s*(?:cabins?|cabine?|kabine?)\b/i);
    if (!inline) return null;
    const v = Number.parseInt(inline[1], 10);
    if (!Number.isFinite(v) || v < 0 || v > 20) return null;
    return v;
  }
  const v = Number.parseInt(m[1], 10);
  if (!Number.isFinite(v) || v < 0 || v > 20) return null;
  return v;
}

function parseFuelTypeFromText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\b(diesel|gasolio|nafta)\b/.test(lower)) return "diesel";
  if (/\b(gasoline|petrol|benzin|benzin[a]?)\b/.test(lower)) return "gasoline";
  if (/\b(electric|elektri[ck]n?)\b/.test(lower)) return "electric";
  if (/\b(hybrid|ibrido)\b/.test(lower)) return "hybrid";
  return null;
}

function parseHullMaterialFromText(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(fiberglass|fibreglass|grp|gfk|vetroresina|composite)\b/.test(t)) return "fiberglass";
  if (/\b(steel|acciaio|stahl|čelik)\b/.test(t)) return "steel";
  if (/\b(aluminum|aluminium|alu)\b/.test(t)) return "aluminum";
  if (/\b(wood|drvo|legno|holz)\b/.test(t)) return "wood";
  if (/\b(carbo[nio]|carbon)\b/.test(t)) return "carbon";
  return null;
}

function inferBoatTypeFromUrl(url: string): "sailboat" | "powerboat" | null {
  const u = url.toLowerCase();
  if (
    /\/(motornaplovila|motorna-plovila|motorna_plovila|motor-boats?|motorboats?|powerboats?|power-?boats?)\//.test(
      u,
    ) ||
    /[?&]cat=2(?:[&#]|$)/.test(u) ||
    /[?&]rubrika=1(?:[&#]|$)/.test(u) ||
    /\/motor-boats-203(?:[/?#]|$)/.test(u) ||
    /\/(?:type-power|motorboats?|motor-boats|flybridge|motoryacht)\b/.test(u) ||
    /\/en\/motorboats?\b/.test(u) ||
    /\/buy\/motor-yachts\b/.test(u) ||
    /\/class-motor-boats\b/.test(u)
  ) {
    return "powerboat";
  }
  if (
    /\/(jadrnice|sailboats?|sailing|vela|barca-a-vela)\//.test(u) ||
    /[?&]cat=1(?:[&#]|$)/.test(u) ||
    /[?&]rubrika=2(?:[&#]|$)/.test(u) ||
    /\/sailboats-202(?:[/?#]|$)/.test(u) ||
    /\/(?:type-sail|sailboats?|sailing-boats|catamaran)\b/.test(u) ||
    /\/en\/sailboats?\b/.test(u) ||
    /\/buy\/sailboats\b/.test(u) ||
    /\/class-sailing-boats\b/.test(u)
  ) {
    return "sailboat";
  }
  return null;
}

function detectBoatType(
  text: string,
  url: string,
  fallback: "sailboat" | "powerboat" | "auto",
): "sailboat" | "powerboat" | null {
  // Use URL/category inference only for import-targeted listings (auto mode).
  if (fallback === "auto") {
    const urlType = inferBoatTypeFromUrl(url);
    if (urlType) return urlType;
  }

  const u = `${url} ${text}`.toLowerCase();
  const sailRe =
    /\b(sailboat|sailing|sail|segelboot|segelyacht|segelbåt|veliero|barca a vela|jedrilica|voilier|velero|jadrnic[ae]|jadrno)\b/;
  const powerRe =
    /\b(powerboat|motorboat|motoryacht|motorboot|motorbåt|barca a motore|gliser|motorn[ao]|motornaplovila|motorna plovila|fuoribordo|entrobordo|outboard|inboard|sterndrive|jet drive|planing)\b/;
  const sailGearRe = /\b(mainsail|genoa|spinnaker|jib|mast|rigging)\b/;

  const sailHits = Number(sailRe.test(u)) + Number(sailGearRe.test(u));
  const powerHits = Number(powerRe.test(u));

  if (powerHits > sailHits) return "powerboat";
  if (sailHits > powerHits) return "sailboat";
  if (fallback === "auto") return null;
  return fallback;
}

function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  if (m) return decodeEntities(m[1]);
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1]) : null;
}

function extractJsonLd(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      /* ignore */
    }
  }
  return blocks;
}

function resolveUrl(src: string, base: string): string {
  try {
    if (src.startsWith("//")) return "https:" + src;
    if (src.startsWith("http")) return src;
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

function extractTrovobarcheImages(html: string, baseUrl: string, max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const normalized = resolveUrl(u, baseUrl);
    // Keep only listing media assets, avoid logos/similar-ads noise.
    if (!/\/storage\/media\//i.test(normalized)) return;
    if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  // Preferred source: main listing gallery in the "pics" section.
  const picsIdx = html.search(/id=["']pics["']/i);
  if (picsIdx >= 0) {
    const picsBlock = captureBlock(html, picsIdx, "div", 120000);
    const anchorRe =
      /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'][^>]*?(?:data-thumb=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'])?[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(picsBlock)) !== null) {
      // Prefer zoom/full image in href; fallback to thumb if needed.
      push(m[1]);
      if (m[2]) push(m[2]);
      if (out.length >= max) return out.slice(0, max);
    }
  }

  // Fallback: parse fotorama anchors globally.
  const fotoramaBlockRe = /<div[^>]*class=["'][^"']*fotorama[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let fm: RegExpExecArray | null;
  while ((fm = fotoramaBlockRe.exec(html)) !== null) {
    const anchorRe =
      /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'][^>]*?(?:data-thumb=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'])?[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(fm[1])) !== null) {
      push(m[1]);
      if (m[2]) push(m[2]);
      if (out.length >= max) return out.slice(0, max);
    }
  }

  return out.slice(0, max);
}

function extractScanboatImages(html: string, baseUrl: string, max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const normalized = resolveUrl(u, baseUrl);
    // Keep only listing photo assets, exclude shared "similar boats" thumbs.
    if (!/\/images\/boats\//i.test(normalized)) return;
    if (!/-scanboat-picture-\d+/i.test(normalized)) return;
    if (/_thumb\./i.test(normalized)) return;
    if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  const og = extractMeta(html, "og:image");
  if (og) push(og);

  const re = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    push(m[1]);
    if (out.length >= max) break;
  }

  return out.slice(0, max);
}

function extractYachtallImages(html: string, baseUrl: string, max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const normalized = resolveUrl(u, baseUrl);
    if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(normalized)) return;
    if (
      /\b(logo|icon|sprite|placeholder|pixel|tracking|avatar|banner|ads?|advert|facebook|instagram|linkedin|youtube)\b/i.test(
        normalized,
      )
    ) {
      return;
    }
    if (/(thumb|thumbnail|small|icon|header|footer)/i.test(normalized) && /\/(image|images|photos?|media)\//i.test(normalized)) {
      return;
    }
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  // Prefer structured listing images when present.
  const lds = extractJsonLd(html);
  for (const ld of lds) {
    const types = ([] as string[]).concat(ld?.["@type"] || []);
    const isListingLike = types.some((t) => /Product|Vehicle|Boat|Vessel|Offer/i.test(String(t)));
    if (!isListingLike) continue;
    if (ld?.image) {
      const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
      for (const img of imgs) {
        if (typeof img === "string") push(img);
        if (out.length >= max) return out.slice(0, max);
      }
    }
  }

  const og = extractMeta(html, "og:image");
  if (og) push(og);
  const tw = extractMeta(html, "twitter:image");
  if (tw) push(tw);
  if (out.length >= max) return out.slice(0, max);

  // Gallery anchors are usually cleaner than all page <img> tags.
  const aRe = /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(html)) !== null) {
    push(m[1]);
    if (out.length >= max + 3) break;
  }

  return out.slice(0, max);
}

function extractFindalyImages(html: string, baseUrl: string, max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const normalized = resolveUrl(u, baseUrl);
    if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(normalized)) return;
    if (/\/_next\/image/i.test(normalized)) return;
    if (
      /\b(logo|icon|sprite|placeholder|pixel|tracking|avatar|banner|ads?|advert|facebook|instagram|linkedin|youtube)\b/i.test(
        normalized,
      )
    ) {
      return;
    }
    if (/(thumb|thumbnail|small|icon|header|footer)/i.test(normalized) && /\/(image|images|photos?|media)\//i.test(normalized)) {
      return;
    }
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  // Prefer structured listing images.
  const lds = extractJsonLd(html);
  for (const ld of lds) {
    const types = ([] as string[]).concat(ld?.["@type"] || []);
    const isListingLike = types.some((t) => /Product|Vehicle|Boat|Vessel|Offer/i.test(String(t)));
    if (!isListingLike) continue;
    if (ld?.image) {
      const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
      for (const img of imgs) {
        if (typeof img === "string") push(img);
        if (out.length >= max) return out.slice(0, max);
      }
    }
  }

  const og = extractMeta(html, "og:image");
  if (og) push(og);
  const tw = extractMeta(html, "twitter:image");
  if (tw) push(tw);
  if (out.length >= max) return out.slice(0, max);

  // Fallback to direct media links in the page (findaly commonly uses blob storage links).
  const mediaRe = /(https?:\/\/[^\s"'()]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'()]*)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = mediaRe.exec(html)) !== null) {
    push(m[1]);
    if (out.length >= max + 5) break;
  }

  return out.slice(0, max);
}

function extractImages(html: string, baseUrl: string, max = 5, site?: string): string[] {
  if (site === "trovobarche.it") {
    const trovobarcheImages = extractTrovobarcheImages(html, baseUrl, max);
    if (trovobarcheImages.length > 0) return trovobarcheImages;
  }
  if (site === "scanboat.com") {
    const scanboatImages = extractScanboatImages(html, baseUrl, max);
    if (scanboatImages.length > 0) return scanboatImages;
  }
  if (site === "yachtall.com") {
    const yachtallImages = extractYachtallImages(html, baseUrl, max);
    if (yachtallImages.length > 0) return yachtallImages;
  }
  if (site === "findaly.co") {
    const findalyImages = extractFindalyImages(html, baseUrl, max);
    if (findalyImages.length > 0) return findalyImages;
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const normalized = resolveUrl(u, baseUrl);
    if (
      site &&
      ["blocket.se", "findaly.co", "yachtall.com", "nautano.com", "boatshop24"].includes(site)
    ) {
      if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(normalized)) return;
      if (/\b(logo|icon|sprite|placeholder|pixel|tracking|avatar|googleads|doubleclick)\b/i.test(normalized)) return;
      if (/(thumb|thumbnail|small|icon)/i.test(normalized) && /\/(image|images|photos?|media)\//i.test(normalized)) {
        return;
      }
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  };

  const og = extractMeta(html, "og:image");
  if (og) push(og);
  const re = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+\.(?:jpe?g|png|webp))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (/\b(logo|icon|sprite|placeholder|pixel|tracking|favicon|avatar)\b/i.test(u)) continue;
    push(u);
    if (out.length >= max + 5) break;
  }
  if (out.length === 0) {
    const mdImgRe = /!\[[^\]]*]\((https?:\/\/[^)]+\.(?:jpe?g|png|webp)(?:\?[^)]*)?)\)/gi;
    while ((m = mdImgRe.exec(html)) !== null) {
      const clean = m[1].split(/\s+/)[0];
      push(clean);
      if (out.length >= max + 5) break;
    }
  }
  if (out.length === 0 && site === "blocket.se") {
    const blocketCdnRe = /(https?:\/\/images\.blocketcdn\.se\/[^\s)"']+)/gi;
    while ((m = blocketCdnRe.exec(html)) !== null) {
      const clean = m[1].split(/\s+/)[0];
      push(clean);
      if (out.length >= max + 5) break;
    }
  }

  // mornar.net: first image on listing pages is the site header logo banner — drop it.
  let result = out;
  if (site === "mornar.net" && result.length > 1) {
    result = result.slice(1);
  }
  return result.slice(0, max);
}

function extractSectionFromReadableText(text: string, startLabels: string[], stopLabels: string[]): string {
  if (!text) return "";
  const normalized = text.replace(/\r/g, "").trim();
  const startRegex = new RegExp(`\\b(?:${startLabels.join("|")})\\b`, "i");
  const startMatch = normalized.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return "";
  const rest = normalized.slice(startMatch.index + startMatch[0].length).trim();
  if (!rest) return "";
  const stopRegex = new RegExp(`\\b(?:${stopLabels.join("|")})\\b`, "i");
  const stopMatch = rest.match(stopRegex);
  return (stopMatch ? rest.slice(0, stopMatch.index) : rest).trim();
}

function extractEquipmentFromTextSection(section: string, max = 120): string[] {
  if (!section) return [];
  const lines = section
    .split(/\n+/)
    .map((l) => l.replace(/^[•·\-\*\s]+/, "").trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.length < 2 || line.length > 120) continue;
    if (/^(specifications?|description|technical data)$/i.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function extractFeatureMapFromTextSection(section: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!section) return out;
  const lines = section
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9 /()&+.,-]{1,70})\s*[:\-]\s*(.{1,180})$/);
    if (!m) continue;
    const key = m[1].toLowerCase().trim();
    const value = m[2].replace(/\s+/g, " ").trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  for (let i = 0; i < lines.length - 1; i++) {
    const k = lines[i];
    const v = lines[i + 1];
    if (!k || !v) continue;
    if (k.length < 2 || k.length > 70 || v.length < 1 || v.length > 180) continue;
    if (!/^[A-Za-z][A-Za-z0-9 /()&+.,-]+$/.test(k)) continue;
    if (/[:\-]/.test(k)) continue;
    if (/^(description|specifications|equipment|features|contact)$/i.test(k)) continue;
    out[k.toLowerCase().trim()] = v;
  }
  return out;
}

function extractMarketplaceSections(html: string, text: string): {
  description: string | null;
  equipment: string[];
  featureMap: Record<string, string>;
} {
  const fullText = htmlToReadableText(html);
  const descriptionSection =
    extractSectionFromReadableText(fullText, ["Description", "About this boat", "Omschrijving"], [
      "Specifications",
      "Technical data",
      "Equipment",
      "Features",
      "Contact",
    ]) || null;
  const specsSection = extractSectionFromReadableText(fullText, ["Specifications", "Technical data", "Details"], [
    "Equipment",
    "Description",
    "Contact",
  ]);
  const equipmentSection = extractSectionFromReadableText(fullText, ["Equipment", "Features", "Inventory"], [
    "Description",
    "Contact",
    "Location",
  ]);

  const featureMap = {
    ...extractFeatureMapFromHtml(html),
    ...extractFeatureMapFromTextSection(specsSection),
  };
  const equipment = extractEquipmentFromTextSection(equipmentSection, 120);
  const description = descriptionSection && descriptionSection.length > 50 ? descriptionSection.slice(0, 5000) : null;
  if (equipment.length === 0) {
    const bulletLines = fullText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => /^[-*•]\s+.{2,120}$/.test(l))
      .map((l) => l.replace(/^[-*•]\s+/, "").trim());
    for (const item of bulletLines) {
      if (equipment.length >= 120) break;
      if (!equipment.includes(item)) equipment.push(item);
    }
  }

  if (!description && text.length > 120) {
    const md = extractMeta(html, "description") || extractMeta(html, "og:description");
    if (md && md.length > 50) return { description: md.slice(0, 5000), equipment, featureMap };
  }
  return { description, equipment, featureMap };
}

// ---------- Fetch with proxy fallback ----------

const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,it;q=0.8,de;q=0.7,hr;q=0.6",
  "Accept-Encoding": "gzip, deflate",
};

async function fetchHtmlViaProxy(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": browserHeaders["User-Agent"], "X-Return-Format": "html" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 500) return html;
    }
  } catch {
    /* give up */
  }
  return null;
}

async function fetchHtmlViaPlaywright(url: string, timeoutMs = 20000): Promise<string | null> {
  if (!PLAYWRIGHT_WS_ENDPOINT) return null;
  let browser: any = null;
  let context: any = null;
  try {
    const { chromium } = await import("npm:playwright-core");
    browser = await chromium.connect(PLAYWRIGHT_WS_ENDPOINT, { timeout: Math.min(timeoutMs, 20000) });
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(1000);
    const html = await page.content();
    return html && html.length > 500 ? html : null;
  } catch (e) {
    console.log(`[scrape-free] playwright failed ${url}: ${e}`);
    return null;
  } finally {
    try {
      if (context) await context.close();
    } catch {
      /* ignore */
    }
    try {
      if (browser) await browser.close();
    } catch {
      /* ignore */
    }
  }
}

function shouldPreferPlaywright(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    const matched = Object.keys(SITE_PROFILES).find((site) => hostname.includes(site));
    return matched ? getSiteProfile(matched).preferPlaywright : false;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  },
): Promise<T> {
  const retries = Math.max(0, options?.retries ?? 2);
  const baseDelayMs = Math.max(50, options?.baseDelayMs ?? 300);
  const maxDelayMs = Math.max(baseDelayMs, options?.maxDelayMs ?? 2500);

  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === retries) break;
      const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 160);
      await sleep(exp + jitter);
      attempt++;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Retryable operation failed");
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const maxWorkers = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;

  const workers = Array.from({ length: maxWorkers }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      await handler(items[idx], idx);
    }
  });

  await Promise.all(workers);
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
  if (shouldPreferPlaywright(url)) {
    const renderedFirst = await fetchHtmlViaPlaywright(url, Math.max(timeoutMs, 18000));
    if (renderedFirst) return renderedFirst;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: browserHeaders, redirect: "follow", signal: ctrl.signal });
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 500) return html;
    }
  } catch {
    /* fall through */
  } finally {
    clearTimeout(t);
  }

  // Playwright render path (requires remote websocket endpoint in env).
  const rendered = await fetchHtmlViaPlaywright(url, Math.max(timeoutMs, 18000));
  if (rendered) return rendered;

  // Fallback: r.jina.ai proxy (free, returns rendered HTML)
  return await fetchHtmlViaProxy(url, timeoutMs);
}

async function fetchBoat24LocationViaProxy(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": browserHeaders["User-Agent"] },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const body = await res.text();
    if (!body) return null;

    const normalize = (v: string) =>
      v
        .replace(/\*\*/g, "")
        .replace(/\s*»\s*/g, " » ")
        .replace(/\s{2,}/g, " ")
        .trim();

    const locationSection = body.match(/##\s*Location\s*\n+([^\n]+)\n/i);
    if (locationSection?.[1]) {
      const val = normalize(locationSection[1]);
      if (val.length >= 3 && val.length <= 80) return val;
    }

    const lineMatch = body.match(/(?:^|\n)\s*Location\s*\n+\s*([^\n]{3,80})(?:\n|$)/i);
    if (lineMatch?.[1]) return normalize(lineMatch[1]);

    const inline = body.match(/\bLocation\b[\s:|-]+([A-Za-z][A-Za-z\s\-»*]{2,80})/i);
    if (inline?.[1]) return normalize(inline[1]);
  } catch {
    /* ignore */
  }
  return null;
}

// ---------- Extract listing links from a category page ----------

function extractListingLinks(html: string, baseUrl: string, site: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  const add = (rawUrl: string, rawTitle: string) => {
    const href = resolveUrl(rawUrl, baseUrl);
    if (seen.has(href)) return;
    if (!isValidListingUrl(href, site)) return;
    seen.add(href);
    out.push({ url: href, title: (rawTitle || "").slice(0, 200) });
  };

  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    add(m[1], stripTags(m[2]));
  }

  // r.jina.ai or markdown-like index pages may not preserve <a> tags.
  const mdRe = /\[([^\]]{1,220})\]\((https?:\/\/[^)\s]+)\)/g;
  while ((m = mdRe.exec(html)) !== null) {
    add(m[2], m[1]);
  }

  const rawUrlRe = /(https?:\/\/[^\s)]+(?:\/mobility\/item\/\d+|\/en\/boat\/[a-z0-9-]+-s\d+|\/en\/ship\/[A-Za-z0-9-]+|\/buy\/[a-z0-9-]+|\/boat\/[a-z0-9-]+-\d{5,}))/gi;
  while ((m = rawUrlRe.exec(html)) !== null) {
    add(m[1], "");
  }
  return out;
}

function extractBlocket(text: string): { description: string | null; equipment: string[]; featureMap: Record<string, string> } {
  const featureMap: Record<string, string> = {};
  const equipment: string[] = [];
  const clean = text.replace(/\r/g, "");

  const descSection = clean.match(/##\s*Beskrivning\s*([\s\S]*?)(?:##\s*Specifikationer|##\s*Plats|$)/i)?.[1] || "";
  const specsSection = clean.match(/##\s*Specifikationer\s*([\s\S]*?)(?:##\s*Plats|$)/i)?.[1] || "";
  const equipmentSection = descSection.match(/-+\s*Utrustning\s*-+([\s\S]*?)(?:##|$)/i)?.[1] || "";

  for (const line of specsSection.split(/\n+/)) {
    const kv = line.match(/^([A-Za-zÅÄÖåäö ]{2,40})\s*[-:]?\s*(.{1,140})$/);
    if (!kv) continue;
    featureMap[kv[1].toLowerCase().trim()] = kv[2].trim();
  }

  for (const line of equipmentSection.split(/\n+/)) {
    const item = line.replace(/^[•·\-\*\s]+/, "").trim();
    if (item.length >= 2 && item.length <= 120) equipment.push(item);
  }

  const imageMatches = Array.from(clean.matchAll(/https:\/\/images\.blocketcdn\.se\/[^\s)]+/gi)).map((m) =>
    m[0].split(/\s+/)[0],
  );
  if (imageMatches.length > 0) featureMap["image_urls"] = Array.from(new Set(imageMatches)).join(" | ");

  const description = descSection.replace(/\n{3,}/g, "\n\n").trim();
  return { description: description || null, equipment, featureMap };
}

function extractFindaly(text: string): { description: string | null; equipment: string[]; featureMap: Record<string, string> } {
  const featureMap: Record<string, string> = {};
  const equipment: string[] = [];
  const clean = text.replace(/\r/g, "");
  const details = clean.match(/#\s+[^\n]+\n([\s\S]*?)DescriptionSpecificationsFeatures/i)?.[1] || "";
  const body = clean.match(/DescriptionSpecificationsFeatures\s*([\s\S]*?)###\s*Listing details/i)?.[1] || "";
  const desc = body.replace(/\n{3,}/g, "\n\n").trim();
  const yr = clean.match(/\bYear\s*(\d{4})\b/i)?.[1];
  if (yr) featureMap["year"] = yr;
  const cab = clean.match(/\bCabins\s*(\d{1,2})\b/i)?.[1];
  if (cab) featureMap["cabins"] = cab;
  const len = clean.match(/\bLength\s*([0-9]+(?:[.,][0-9]+)?)\s*m\b/i)?.[1];
  if (len) featureMap["length"] = `${len} m`;
  const loc = clean.match(/\bLocation\s*([^\n]{2,80})\n/i)?.[1]?.trim();
  if (loc && loc !== "—") featureMap["location"] = loc;
  for (const m of clean.matchAll(/https:\/\/uj6nijlotulxboxg\.public\.blob\.vercel-storage\.com\/[^\s)]+/gi)) {
    equipment.push(m[0]);
  }
  if (details) featureMap["listing_details"] = details.replace(/\s+/g, " ").trim().slice(0, 180);
  return { description: desc || null, equipment: [], featureMap };
}

// ---------- Site-specific description + equipment extractors ----------

// Walk into the FIRST opening tag in `slice`, then return the substring
// up until that tag's matching closing tag (handling nested same-name tags).
function captureBlock(html: string, startIdx: number, tag: string, maxLen = 20000): string {
  const open = new RegExp(`<${tag}\\b[^>]*>`, "i");
  const close = new RegExp(`</${tag}\\s*>`, "i");
  const slice = html.slice(startIdx, startIdx + maxLen + 2000);
  const om = slice.match(open);
  if (!om) return slice.slice(0, maxLen);
  let depth = 1;
  let i = (om.index ?? 0) + om[0].length;
  while (depth > 0 && i < slice.length) {
    const rest = slice.slice(i);
    const no = rest.match(new RegExp(`<${tag}\\b[^>]*>`, "i"));
    const nc = rest.match(close);
    if (!nc) break;
    if (no && (no.index ?? Infinity) < (nc.index ?? Infinity)) {
      depth++;
      i += (no.index ?? 0) + no[0].length;
    } else {
      depth--;
      i += (nc.index ?? 0) + nc[0].length;
      if (depth === 0) return slice.slice((om.index ?? 0) + om[0].length, i - nc[0].length);
    }
  }
  return slice.slice((om.index ?? 0) + om[0].length, Math.min(i, maxLen));
}

function extractListItems(blockHtml: string, max = 80): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blockHtml)) !== null) {
    const t = stripTags(m[1]).replace(/^[•·\-\*\s]+/, "").trim();
    if (t && t.length >= 2 && t.length <= 120 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
      if (out.length >= max) break;
    }
  }
  return out;
}

function htmlToReadableText(blockHtml: string): string {
  if (!blockHtml) return "";
  const normalized = blockHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(?:div|section|article|table|tr|td|th|h[1-6])>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(?:ul|ol)>/gi, "\n");

  return decodeEntities(normalized.replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDescriptionLayout(text: string | null | undefined): string | null {
  if (!text) return null;
  const normalized = String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function addFeature(featureMap: Record<string, string>, key: string, value: unknown) {
  if (!key || value === null || value === undefined) return;
  const k = key.trim().toLowerCase();
  const v = String(value).trim();
  if (!k || !v) return;
  if (k.length > 100 || v.length > 220) return;
  featureMap[k] = v;
}

function extractBoat24FeatureMapFromJsonLd(html: string): Record<string, string> {
  const featureMap: Record<string, string> = {};
  const blocks = extractJsonLd(html);
  for (const block of blocks) {
    const arr = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
    for (const ld of arr) {
      if (!ld || typeof ld !== "object") continue;
      addFeature(featureMap, "brand", ld.brand?.name || ld.brand);
      addFeature(featureMap, "model", ld.model);
      addFeature(featureMap, "year", ld.productionDate || ld.releaseDate || ld.year);
      addFeature(featureMap, "fuel type", ld.fuelType || ld.vehicleEngine?.fuelType);
      addFeature(featureMap, "engine", ld.vehicleEngine?.name || ld.vehicleEngine?.model || ld.engine);
      addFeature(featureMap, "engine power", ld.vehicleEngine?.power?.value || ld.vehicleEngine?.power);
      addFeature(featureMap, "hull material", ld.material || ld.hullMaterial);
      addFeature(featureMap, "cabins", ld.numberOfCabins || ld.numberOfRooms);
      addFeature(featureMap, "berths", ld.numberOfBeds);
      addFeature(featureMap, "length", ld.length?.value || ld.length);
      addFeature(featureMap, "beam", ld.width?.value || ld.beam);
      addFeature(featureMap, "draft", ld.depth?.value || ld.draft);
      addFeature(featureMap, "displacement", ld.weight?.value || ld.displacement);
      const addr = ld.address || ld.location?.address || ld.offers?.availableAtOrFrom?.address;
      addFeature(
        featureMap,
        "location",
        ld.location?.name || addr?.addressLocality || addr?.addressRegion || addr?.addressCountry,
      );

      const additional = Array.isArray(ld.additionalProperty) ? ld.additionalProperty : [];
      for (const p of additional) {
        if (!p || typeof p !== "object") continue;
        addFeature(featureMap, p.name || p.propertyID || p.label, p.value);
      }
    }
  }
  return featureMap;
}

function extractBoat24LocationFromHtml(html: string): string | null {
  const idx = html.search(/>\s*Location\s*</i);
  if (idx < 0) return null;
  const block = captureBlock(html, Math.max(0, idx - 200), "div", 6000);
  const plain = stripTags(block)
    .replace(/\b(location|standort|posizione|lokacija)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const m = plain.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (!m) return null;
  const val = m[1].trim();
  if (val.length < 3 || val.length > 40) return null;
  if (/(contact|favorite|share|views|save pdf|notes)/i.test(val)) return null;
  return val;
}

function extractBoat24LocationFromRawJson(html: string): string | null {
  const re =
    /"(?:addressCountry|countryName|country|locationName|location|regionName|region)"\s*:\s*"([A-Z][A-Za-z\s-]{2,40})"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const v = (m[1] || "").trim();
    if (!v) continue;
    if (/(contact|favorite|share|views|save pdf|notes|boat24|usedboats)/i.test(v)) continue;
    return v;
  }
  return null;
}

// boat24.com: equipment is in `<div id="equipment">…<ul>…<li>Item</li></ul>`
function extractBoat24(html: string): {
  description: string | null;
  equipment: string[];
  featureMap: Record<string, string>;
} {
  let description: string | null = null;
  const lds = extractJsonLd(html);
  for (const block of lds) {
    const arr = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
    for (const ld of arr) {
      if (ld?.description && typeof ld.description === "string" && ld.description.length > 60) {
        description = ld.description.replace(/\\r\\n|\\n/g, "\n").trim();
        break;
      }
    }
    if (description) break;
  }
  const equipment: string[] = [];
  const eqIdx = html.search(/id=["']equipment["']/i);
  if (eqIdx >= 0) {
    const block = captureBlock(html, eqIdx, "ul", 30000);
    equipment.push(...extractListItems(block, 120));
  }
  const featureMap = extractBoat24FeatureMapFromJsonLd(html);
  const locationFromHtml = extractBoat24LocationFromHtml(html);
  if (locationFromHtml) addFeature(featureMap, "location", locationFromHtml);
  const locationFromRawJson = extractBoat24LocationFromRawJson(html);
  if (locationFromRawJson) addFeature(featureMap, "location", locationFromRawJson);
  return { description, equipment, featureMap };
}

// trovobarche.it: description in `cls-description` card, equipment in
// "Optionals and equipment" card, features in `cls-features` card.
function extractTrovobarche(html: string): {
  description: string | null;
  equipment: string[];
  featureMap: Record<string, string>;
} {
  let description: string | null = null;
  const descIdx = html.search(/<div[^>]+class=["'][^"']*cls-description[^"']*["'][^>]*>/i);
  if (descIdx >= 0) {
    const block = captureBlock(html, descIdx, "div", 30000);
    // New template: first data-readmore block contains canonical listing description.
    const readmoreMatch = block.match(/<div[^>]+data-readmore=["'][^"']+["'][^>]*>([\s\S]*?)<\/div>/i);
    // Legacy template fallback: text may be inside translator-content.
    const tcMatch = block.match(/class=["']translator-content[^"']*["'][^>]*>([\s\S]*?)(?:<div><button|<\/div>\s*<\/div>)/i);
    const raw = readmoreMatch?.[1] || tcMatch?.[1] || block;
    let txt = htmlToReadableText(raw)
      .replace(/\b(Read everything|Show full description|Hide full description)\b/gi, "")
      .trim();
    // Remove UI/secondary sections that can leak into older templates.
    txt = txt
      .replace(/\bInsert note\b[\s\S]*$/i, "")
      .replace(/\bSuspicious ad\b[\s\S]*$/i, "")
      .replace(/\bOptionals and equipment\b[\s\S]*$/i, "")
      .trim();
    if (txt.length > 30) description = txt;
  }

  const equipment: string[] = [];
  const eqIdx = html.search(/>Optionals and equipment</i);
  if (eqIdx >= 0) {
    const block = captureBlock(html, eqIdx, "ul", 20000);
    equipment.push(...extractListItems(block, 120));
  }

  const featureMap: Record<string, string> = {};
  const featIdx = html.search(/<div[^>]+class=["'][^"']*cls-features[^"']*["'][^>]*>/i);
  if (featIdx >= 0) {
    const block = captureBlock(html, featIdx, "div", 120000);
    // Legacy structure: list items with badge values.
    const legacyRe = /<li[^>]*>([^<]+?)<span[^>]*class=["']badge[^"']*["'][^>]*>([^<]+)<\/span>/gi;
    let m: RegExpExecArray | null;
    while ((m = legacyRe.exec(block)) !== null) {
      const k = stripTags(m[1]).trim();
      const v = stripTags(m[2]).trim();
      if (k && v) featureMap[k.toLowerCase()] = v;
    }

    // Current structure: `<div class="item ..."><span class="label">..</span><span class="value">..</span>`
    const itemRe =
      /<div[^>]*class=["'][^"']*\bitem\b[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class=["'][^"']*\bvalue\b[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi;
    while ((m = itemRe.exec(block)) !== null) {
      const k = stripTags(m[1]).trim();
      const v = stripTags(m[2]).trim();
      if (k && v) featureMap[k.toLowerCase()] = v;
    }
  }

  // Global safety nets for alternate/newer Trovobarche templates.
  let m: RegExpExecArray | null;

  // Legacy "li + badge" can appear outside the primary captured block.
  const legacyGlobalRe = /<li[^>]*>([^<]+?)<span[^>]*class=["']badge[^"']*["'][^>]*>([^<]+)<\/span>/gi;
  while ((m = legacyGlobalRe.exec(html)) !== null) {
    const k = stripTags(m[1]).trim();
    const v = stripTags(m[2]).trim();
    if (k && v) featureMap[k.toLowerCase()] = v;
  }

  // Generic label/value class pairing.
  const labelValueRe =
    /<(?:span|div)[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>[\s\S]{0,300}?<(?:span|div)[^>]*class=["'][^"']*\bvalue\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/gi;
  while ((m = labelValueRe.exec(html)) !== null) {
    const k = stripTags(m[1]).trim();
    const v = stripTags(m[2]).trim();
    if (k && v) featureMap[k.toLowerCase()] = v;
  }

  // Table-like specs fallback.
  const tableRowRe = /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;
  while ((m = tableRowRe.exec(html)) !== null) {
    const k = stripTags(m[1]).trim();
    const v = stripTags(m[2]).trim();
    if (k && v && k.length <= 80 && v.length <= 120) {
      featureMap[k.toLowerCase()] = v;
    }
  }

  return { description, equipment, featureMap };
}

function extractTrovobarcheCity(html: string, featureMap: Record<string, string>): string | null {
  const visibleTo = findFeatureValue(featureMap, /\b(visible to|location|località|localita|city)\b/i);
  if (visibleTo) {
    const cleaned = visibleTo
      .replace(/\b(?:IT|HR|SI|DE|FR|ES)\b$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const m = cleaned.match(/\b([A-Z][A-Za-z'’\- ]{2,40})\b/);
    if (m?.[1]) return m[1].trim();
  }

  // Seller info usually contains "00137 Roma(RM)" or similar.
  const zipCity = html.match(/\b\d{4,6}\s+([A-Z][A-Za-z'’\- ]{2,40})\s*\([A-Z]{2}\)/);
  if (zipCity?.[1]) return zipCity[1].trim();

  return null;
}

function extractScanboatDescriptionFromText(text: string): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  const marker = "Description";
  const idx = normalized.indexOf(marker);
  if (idx < 0) return null;
  let body = normalized.slice(idx + marker.length).trim();
  // Scanboat typically appends machine-translated/legal boilerplate after seller text.
  body = body
    .split(/(?:Dette er en privat annonce|Detta är en privat skapad annons|Dit is een privat advertentie|Dies ist eine privat erstellte Anzeige)/i)[0]
    .split(/(?:Share Follow us Specifications|Specifications Equipment|Impressum - Contact - Scanboat\.com)/i)[0]
    .trim();
  // Drop common intro/legal lines that pollute user-facing description.
  body = body
    .replace(
      /This is a privately created ad for .*?(?:\.\s+|$)/i,
      "",
    )
    .replace(
      /For further info, as description, boat equipment list or photos for .*?(?:\.\s+|$)/i,
      "",
    )
    .replace(
      /Please notice, the seller can have more detailed description of .*?(?:Insert advert button\.?\s*)/i,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  if (body.length < 80) return null;
  // Keep scanboat descriptions concise and avoid multilingual spillover.
  return body.slice(0, 1600);
}

function extractScanboatSpecifications(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  const normalized = text.replace(/\s+/g, " ").trim();
  const start = normalized.search(/\bSpecifications\b/i);
  if (start < 0) return out;
  const rest = normalized.slice(start);
  const endMatch = rest.match(/\b(Equipment|Impressum|Contact - Scanboat\.com|Similar boats)\b/i);
  const section = endMatch ? rest.slice(0, endMatch.index) : rest;
  // Parse "Label Value" sequences from known spec labels used on scanboat pages.
  const labelRe =
    /\b(Hull type|Length|Beam|Deplacement|Depth|Engine|Total power|Engine year|Engine count|Engine place|Fuel|Drive shaft|Cooling system|Crusing speed|Max Speed)\b\s*([^]+?)(?=\b(?:Hull type|Length|Beam|Deplacement|Depth|Engine|Total power|Engine year|Engine count|Engine place|Fuel|Drive shaft|Cooling system|Crusing speed|Max Speed)\b|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(section)) !== null) {
    const key = m[1].toLowerCase().trim();
    const value = (m[2] || "").replace(/\s+/g, " ").trim();
    if (!key || !value) continue;
    if (value.length > 180) continue;
    out[key] = value;
  }
  return out;
}

function extractFeatureMapFromHtml(html: string): Record<string, string> {
  const featureMap: Record<string, string> = {};
  const put = (kRaw: string, vRaw: string) => {
    const k = stripTags(kRaw).replace(/[:\s]+$/, "").trim().toLowerCase();
    const v = stripTags(vRaw).trim();
    if (!k || !v) return;
    if (k.length > 100 || v.length > 220) return;
    featureMap[k] = v;
  };

  // <tr><td>Label</td><td>Value</td></tr>
  const rowRe = /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) put(m[1], m[2]);

  // <li>Label <span class="badge">Value</span></li>
  const liRe = /<li[^>]*>([^<]+?)<span[^>]*class=["'][^"']*(?:badge|value)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
  while ((m = liRe.exec(html)) !== null) put(m[1], m[2]);

  // <span class="label">Label</span> ... <span class="value">Value</span>
  const labelValueRe =
    /<(?:span|div)[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>[\s\S]{0,300}?<(?:span|div)[^>]*class=["'][^"']*\bvalue\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/gi;
  while ((m = labelValueRe.exec(html)) !== null) put(m[1], m[2]);

  return featureMap;
}

function findFeatureValue(featureMap: Record<string, string>, keyRe: RegExp): string | null {
  for (const [k, v] of Object.entries(featureMap)) {
    if (keyRe.test(k) && v) return v;
  }
  return null;
}

function findAllFeatureValues(featureMap: Record<string, string>, keyRe: RegExp): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(featureMap)) {
    if (keyRe.test(k) && v) out.push(v);
  }
  return out;
}

function normalizeLocationValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s*»\s*/g, " » ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null;
  if (
    /\b(contact|favorite|share|views|save pdf|notes|comment|komentarji|navtična oprema|piši na|next|previous)\b/i.test(
      cleaned,
    )
  ) {
    return null;
  }
  if (!/[a-z]/i.test(cleaned)) return null;
  return cleaned;
}

function deriveBrandModel(title: string | null, featureMap: Record<string, string>): { brand: string | null; model: string | null } {
  const clean = (v: string | null | undefined) => {
    if (!v) return null;
    const t = v.replace(/\s+/g, " ").trim();
    return t.length > 0 ? t.slice(0, 120) : null;
  };
  const brandFromFeatures = clean(
    findFeatureValue(featureMap, /\b(brand|make|builder|manufacturer|cantiere|marca)\b/i),
  );
  const modelFromFeatures = clean(
    findFeatureValue(featureMap, /\b(model|modello|serie|type)\b/i),
  );
  if (brandFromFeatures || modelFromFeatures) {
    return { brand: brandFromFeatures, model: modelFromFeatures };
  }

  const t = clean(title);
  if (!t) return { brand: null, model: null };
  const tokens = t.split(" ").filter(Boolean);
  if (tokens.length < 2) return { brand: null, model: t };
  return {
    brand: tokens[0],
    model: t,
  };
}

function extractRichFields(
  text: string,
  featureMap: Record<string, string>,
): {
  engine_hours: number | null;
  fuel_type: string | null;
  cabins: number | null;
  hull_material: string | null;
  engine_info: string | null;
} {
  const engineVal = findFeatureValue(
    featureMap,
    /\b(engine|engine model|engine type|motor|motore|motore 1|propulsion|propulsione)\b/i,
  );
  const fuelVal = findFeatureValue(featureMap, /\b(fuel|fuel type|gorivo|carburante|combustibile)\b/i);
  const cabinsVals = findAllFeatureValues(
    featureMap,
    /\b(cabins?|cabine?|kabine?|no\.?\s*of cabins?|number of cabins?)\b/i,
  );
  const hullVal = findFeatureValue(
    featureMap,
    /\b(hull material|material|materiale|construction|costruzione|scafo|hull)\b/i,
  );
  const hoursVal = findFeatureValue(
    featureMap,
    /\b(engine hours|hours|ore moto|radnih sati|stunden|motostunden)\b/i,
  );

  const engine_hours =
    parseEngineHoursFromText(hoursVal || "") ||
    parseEngineHoursFromText(engineVal || "") ||
    parseEngineHoursFromText(text);
  const fuel_type = parseFuelTypeFromText(fuelVal || "") || parseFuelTypeFromText(engineVal || "");
  const cabinsFromFeatures = cabinsVals
    .map((v) => parseCabinsFromText(v))
    .find((v): v is number => typeof v === "number" && Number.isFinite(v));
  const cabins = cabinsFromFeatures ?? parseCabinsFromText(text);
  const hull_material = parseHullMaterialFromText(hullVal || "") || parseHullMaterialFromText(text);
  const engine_info = engineVal ? engineVal.slice(0, 180) : null;

  return { engine_hours, fuel_type, cabins, hull_material, engine_info };
}

function sanitizeSpecsRaw(featureMap: Record<string, string>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [kRaw, vRaw] of Object.entries(featureMap)) {
    const key = kRaw.trim().toLowerCase();
    const value = vRaw.trim();
    if (!key || !value) continue;
    if (key.length > 100 || value.length > 300) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function buildSpecsRawFallback(input: {
  year: number | null;
  length_feet: number | null;
  engine_info: string | null;
  engine_hours: number | null;
  fuel_type: string | null;
  cabins: number | null;
  hull_material: string | null;
  location: string | null;
}): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (input.year !== null) out.year = String(input.year);
  if (input.length_feet !== null) out.length_feet = String(input.length_feet);
  if (input.engine_info) out.engine_info = input.engine_info;
  if (input.engine_hours !== null) out.engine_hours = String(input.engine_hours);
  if (input.fuel_type) out.fuel_type = input.fuel_type;
  if (input.cabins !== null) out.cabins = String(input.cabins);
  if (input.hull_material) out.hull_material = input.hull_material;
  if (
    input.location &&
    input.location.length <= 80 &&
    !/(contact|favorite|share|views|save pdf|notes)/i.test(input.location)
  ) {
    out.location = input.location;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function extractRecentWorkFromListing(
  text: string,
  featureMap: Record<string, string>,
  equipment: string[] | null,
  site: string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (v: string | null | undefined) => {
    const clean = String(v || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean || clean.length < 8 || clean.length > 180) return;
    const k = clean.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(clean);
  };

  // Feature map cues across multilingual listings.
  for (const [kRaw, vRaw] of Object.entries(featureMap)) {
    const k = kRaw.toLowerCase();
    if (
      /\b(recent work|service|serviced|maintenance|maintained|refit|overhaul|renewed|new\s+\w+|updated|replaced|restored|renovated|last service|revisione|manutenzione|obnov|servis|refit)\b/i.test(
        k,
      )
    ) {
      push(vRaw);
      if (out.length >= 8) return out;
    }
  }

  // Equipment lines can contain meaningful "recently replaced/updated" notes.
  for (const item of equipment || []) {
    if (
      /\b(updated|replaced|new|renewed|serviced|maintained|refit|overhaul|restored|renovated|upgraded)\b/i.test(item)
    ) {
      push(item);
      if (out.length >= 8) return out;
    }
  }

  // Description fallback: capture short sentences with work/maintenance cues.
  const sentences = text
    .replace(/\r/g, " ")
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const s of sentences) {
    if (
      /\b(updated|replaced|new|renewed|serviced|maintained|refit|overhaul|restored|renovated|upgraded|winterized|anti-fouling|antifouling)\b/i.test(
        s,
      )
    ) {
      push(s);
      if (out.length >= 8) break;
    }
  }

  // For noisy marketplace pages keep this conservative.
  if (site === "findaly.co" || site === "blocket.se") {
    return out.filter((v) => !/\b(popular|explore|all listings|pages?)\b/i.test(v)).slice(0, 6);
  }
  return out.slice(0, 8);
}

function withStandardSpecSections(specs: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = { ...specs };
  const requiredKeys = [
    "brand",
    "model",
    "type",
    "boat_type",
    "engine_hours",
    "fuel_type",
    "cabins",
    "hull_material",
    "engine_info",
    "equipment",
    "recent_work",
    "image_urls",
    "field_confidence",
    "field_source",
    "ai_details",
    "ai_validation",
  ];
  for (const key of requiredKeys) {
    if (!(key in base)) base[key] = null;
  }
  return base;
}

function buildFieldQualityMeta(input: {
  site: string;
  brand: string | null;
  model: string | null;
  rich: { engine_hours: number | null; fuel_type: string | null; cabins: number | null; hull_material: string | null; engine_info: string | null };
  equipment: string[];
  recentWork: string[];
  images: string[];
  location: string | null;
  featureMap: Record<string, string>;
}): { confidence: Record<string, "high" | "medium" | "low" | "none">; source: Record<string, string> } {
  const profile = getSiteProfile(input.site);
  const confidence: Record<string, "high" | "medium" | "low" | "none"> = {};
  const source: Record<string, string> = {};
  const set = (k: string, present: boolean, src: string, conf: "high" | "medium" | "low" | "none") => {
    source[k] = src;
    confidence[k] = present ? conf : "none";
  };

  set("brand", !!input.brand, input.featureMap.brand ? "feature_map" : "title_derived", input.featureMap.brand ? "high" : "medium");
  set("model", !!input.model, input.featureMap.model ? "feature_map" : "title_derived", input.featureMap.model ? "high" : "medium");
  set("engine_hours", input.rich.engine_hours !== null, "feature_map_or_text", input.rich.engine_hours !== null ? "medium" : "none");
  set("fuel_type", !!input.rich.fuel_type, "feature_map_or_text", input.rich.fuel_type ? "medium" : "none");
  set("cabins", input.rich.cabins !== null, "feature_map_or_text", input.rich.cabins !== null ? "medium" : "none");
  set("hull_material", !!input.rich.hull_material, "feature_map_or_text", input.rich.hull_material ? "medium" : "none");
  set("engine_info", !!input.rich.engine_info, "feature_map_or_text", input.rich.engine_info ? "medium" : "none");
  set(
    "equipment",
    input.equipment.length > 0,
    "site_section_parser",
    profile.equipmentStrategy === "strict" ? (input.equipment.length >= 4 ? "high" : "low") : input.equipment.length >= 2 ? "medium" : "low",
  );
  set("recent_work", input.recentWork.length > 0, "work_signal_parser", input.recentWork.length > 0 ? "medium" : "none");
  set(
    "image_urls",
    input.images.length > 0,
    profile.imageStrategy === "gallery_first" ? "gallery_extractor" : "structured_extractor",
    input.images.length >= 3 ? "high" : input.images.length > 0 ? "medium" : "none",
  );
  set("location", !!input.location, "feature_map_or_text", input.location ? "medium" : "none");

  return { confidence, source };
}

function normalizeSpecKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 80);
}

function cleanSpecValue(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" || typeof raw === "boolean") return raw;
  if (Array.isArray(raw)) return raw.map((v) => cleanSpecValue(v)).filter((v) => v !== null);

  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;

  const eurPatterns = [/€\s*([\d.,\s]{3,})/i, /EUR\s*([\d.,\s]{3,})/i, /([\d.,\s]{3,})\s*€/i, /([\d.,\s]{3,})\s*EUR/i];
  for (const re of eurPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const num = parseNumber(m[1]);
    if (num && num > 0) return Math.round(num);
  }

  const ftMatch = text.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(ft|feet|foot)\b/i);
  if (ftMatch) {
    const ft = parseNumber(ftMatch[1]);
    if (ft && ft > 1) return Math.round(ft * 0.3048 * 100) / 100;
  }

  const meterMatch = text.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*(m|meter|metre|meters|metres)\b/i);
  if (meterMatch) {
    const m = parseNumber(meterMatch[1]);
    if (m && m > 0) return Math.round(m * 100) / 100;
  }

  const numericLike = text.match(/^([\d.,\s]{1,20})\s*(?:hp|kw|h|hours?|cm|mm|kg|kn|nm)?$/i);
  if (numericLike) {
    const num = parseNumber(numericLike[1]);
    if (num !== null) return Number.isInteger(num) ? Math.trunc(num) : Number(num.toFixed(2));
  }

  return text.slice(0, 500);
}

function mergeSpec(specs: Record<string, unknown>, key: string, value: unknown) {
  const normalizedKey = normalizeSpecKey(key);
  if (!normalizedKey) return;
  const cleaned = cleanSpecValue(value);
  if (cleaned === null) return;
  specs[normalizedKey] = cleaned;
}

function buildFlexibleListingOutput(input: {
  title: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  description: string | null;
  full_text: string;
  dynamicSpecs: Record<string, unknown>;
}): {
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
} {
  return {
    core: {
      title: String(input.title || "").trim() || "Unknown listing",
      price_eur: typeof input.price_eur === "number" && Number.isFinite(input.price_eur) ? input.price_eur : null,
      year: typeof input.year === "number" && Number.isFinite(input.year) ? input.year : null,
      length_m:
        typeof input.length_feet === "number" && Number.isFinite(input.length_feet)
          ? Math.round(input.length_feet * 0.3048 * 100) / 100
          : null,
      location: typeof input.location === "string" && input.location.trim() ? input.location.trim() : null,
    },
    specs: input.dynamicSpecs,
    raw: {
      description: String(input.description || "").trim(),
      full_text: input.full_text,
    },
  };
}

type AiBoatDetails = {
  score: number;
  verdict: string;
  confidence_score: number;
  price_assessment: string;
  fair_price_low: number;
  fair_price_high: number;
  target_offer: number;
  walk_away_price: number;
  offer_range: { aggressive: number; realistic: number; safe: number };
  negotiation_anchors: string[];
  recommendations: string[];
  estimated_repair_cost: number;
  repair_breakdown: Array<{ label: string; estimate: number; note?: string }>;
  categories: Array<{ name: string; score: number; max_score: number; details: string; icon: string }>;
  condition: { engine: string; hull: string; sails: string };
  known_issues: string[];
  recent_work: string[];
  equipment_highlights: string[];
  negotiating_tips: string[];
};

function getScoreBreakdownTemplate(boatType: "sailboat" | "powerboat" | null): Array<{ name: string; icon: string }> {
  if (boatType === "powerboat") {
    return [
      { name: "Market Position", icon: "💰" },
      { name: "Engine & Propulsion", icon: "⚙️" },
      { name: "Hull & Structure", icon: "🛡️" },
      { name: "Equipment & Comfort", icon: "🧰" },
      { name: "Ownership Risk", icon: "📉" },
    ];
  }
  return [
    { name: "Market Position", icon: "💰" },
    { name: "Sails & Rigging", icon: "⛵" },
    { name: "Hull & Structure", icon: "🛡️" },
    { name: "Equipment & Comfort", icon: "🧰" },
    { name: "Ownership Risk", icon: "📉" },
  ];
}

function normalizeAiBreakdownAndRecommendations(
  ai: AiBoatDetails,
  boatType: "sailboat" | "powerboat" | null,
): AiBoatDetails {
  const normalizeOneToTwoSentences = (text: string, fallback: string): string => {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    const base = clean || fallback;
    const parts = base.match(/[^.!?]+[.!?]?/g)?.map((p) => p.trim()).filter(Boolean) || [];
    const selected = parts.slice(0, 2).join(" ").trim();
    return selected || fallback;
  };

  const template = getScoreBreakdownTemplate(boatType);
  const byName = new Map(
    (ai.categories || []).map((c) => [c.name.toLowerCase().trim(), c] as const),
  );
  const fallbackScore = Math.max(35, Math.min(95, Math.round(ai.score || 50)));
  const categories = template.map((slot) => {
    const existing =
      byName.get(slot.name.toLowerCase()) ||
      byName.get(slot.name.toLowerCase().replace(/\s*&\s*/g, " & ")) ||
      byName.get(slot.name.toLowerCase().replace(/\s+/g, " "));
    return {
      name: slot.name,
      icon: slot.icon,
      score: existing?.score ?? fallbackScore,
      max_score: 100,
      details: normalizeOneToTwoSentences(
        existing?.details || "",
        `Assessment based on listing data for ${slot.name.toLowerCase()}. Condition and market context support this score.`,
      ),
    };
  });

  const dedup = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
  let recommendations = dedup(ai.recommendations || []);
  if (recommendations.length < 3) {
    const defaults = [
      "Ask for original invoices for engine, standing rigging, and hull works to verify what is actually recent.",
      "Negotiate with line-item deductions tied to unresolved defects (survey, electronics, safety gear), not one global discount.",
      "Request a cold-start sea trial and insist on full RPM range proof under load before agreeing final price.",
      "Price in near-term ownership costs (mooring, insurance, routine refit) and fold them into your offer ceiling.",
      "Set a strict walk-away trigger around hidden structural/mechanical risk discovered after survey.",
    ];
    recommendations = dedup([...recommendations, ...defaults]);
  }
  recommendations = recommendations.slice(0, 5);

  return {
    ...ai,
    categories,
    recommendations,
  };
}

function sanitizeAiBoatDetails(
  input: unknown,
  boatType: "sailboat" | "powerboat" | null,
): AiBoatDetails | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const toNum = (x: unknown, fallback = 0) => (typeof x === "number" && Number.isFinite(x) ? x : fallback);
  const toStr = (x: unknown, fallback = "") => (typeof x === "string" ? x : fallback);
  const toStrArr = (x: unknown, limit = 8) =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string").slice(0, limit) : [];
  const categories = Array.isArray(v.categories)
    ? v.categories
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .slice(0, 8)
        .map((c) => ({
          name: toStr(c.name, "Category"),
          score: toNum(c.score, 0),
          max_score: toNum(c.max_score, 10),
          details: toStr(c.details, ""),
          icon: toStr(c.icon, "•"),
        }))
    : [];
  const repairBreakdown = Array.isArray(v.repair_breakdown)
    ? v.repair_breakdown
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .slice(0, 10)
        .map((r) => ({
          label: toStr(r.label, "Repair item"),
          estimate: toNum(r.estimate, 0),
          note: toStr(r.note, ""),
        }))
    : [];

  const normalized: AiBoatDetails = {
    score: Math.max(0, Math.min(100, toNum(v.score, 50))),
    verdict: toStr(v.verdict, "Fair Deal"),
    confidence_score: Math.max(0, Math.min(100, toNum(v.confidence_score, 50))),
    price_assessment: toStr(v.price_assessment, ""),
    fair_price_low: Math.max(0, toNum(v.fair_price_low, 0)),
    fair_price_high: Math.max(0, toNum(v.fair_price_high, 0)),
    target_offer: Math.max(0, toNum(v.target_offer, 0)),
    walk_away_price: Math.max(0, toNum(v.walk_away_price, 0)),
    offer_range: {
      aggressive: Math.max(0, toNum((v.offer_range as any)?.aggressive, 0)),
      realistic: Math.max(0, toNum((v.offer_range as any)?.realistic, 0)),
      safe: Math.max(0, toNum((v.offer_range as any)?.safe, 0)),
    },
    negotiation_anchors: toStrArr(v.negotiation_anchors, 8),
    recommendations: toStrArr(v.recommendations, 10),
    estimated_repair_cost: Math.max(0, toNum(v.estimated_repair_cost, 0)),
    repair_breakdown: repairBreakdown,
    categories,
    condition: {
      engine: toStr((v.condition as any)?.engine, "unknown"),
      hull: toStr((v.condition as any)?.hull, "unknown"),
      sails: toStr((v.condition as any)?.sails, "unknown"),
    },
    known_issues: toStrArr(v.known_issues, 8),
    recent_work: toStrArr(v.recent_work, 8),
    equipment_highlights: toStrArr(v.equipment_highlights, 20),
    negotiating_tips: toStrArr(v.negotiating_tips, 8),
  };
  return normalizeAiBreakdownAndRecommendations(normalized, boatType);
}

async function generateAiBoatDetails(input: {
  url: string;
  boatType: "sailboat" | "powerboat" | null;
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
}): Promise<AiBoatDetails | null> {
  if (!OPENAI_API_KEY) return null;
  const systemPrompt = `Buyer-side boat analyst. Output JSON only.
Use only given data; no seller-friendly framing.
Schema keys required:
score, verdict, confidence_score, price_assessment, fair_price_low, fair_price_high, target_offer, walk_away_price, offer_range{aggressive,realistic,safe}, negotiation_anchors, recommendations, estimated_repair_cost, repair_breakdown[{label,estimate,note}], categories[{name,score,max_score,details,icon}], condition{engine,hull,sails}, known_issues, recent_work, equipment_highlights, negotiating_tips.
Rules:
- categories: EXACTLY 5 items.
- sailboat category names exactly: Market Position; Sails & Rigging; Hull & Structure; Equipment & Comfort; Ownership Risk.
- powerboat category names exactly: Market Position; Engine & Propulsion; Hull & Structure; Equipment & Comfort; Ownership Risk.
- each category details: 1-2 sentences.
- recommendations: 3-5 items.
- recommendations must be specific, non-generic, and reference concrete listing risks/specs.
- Be strict on scoring calibration (buyer-protective): default to lower scores unless strong evidence supports high confidence.
- Score band guidance:
  - 85-100: exceptional listing with strong evidence of condition, maintenance, and price advantage (rare).
  - 70-84: good listing with mostly positive evidence but at least minor risks.
  - 55-69: average/uncertain listing (this should be the default band when data is incomplete).
  - 40-54: risky listing with multiple concerns or poor data quality.
  - 0-39: high-risk listing with major red flags.
- If important fields are missing/unclear (engine hours, maintenance history, survey evidence), cap score at 64.
- If listing has sparse specs, sparse equipment, or vague description, apply a clear confidence penalty.
- Do NOT inflate score for brand prestige alone.
- Prefer underestimating over overestimating when uncertain.`;

  const userPrompt = `u:${input.url}
core:${JSON.stringify(input.core)}
specs:${JSON.stringify(input.specs)}
desc:${input.raw.description || ""}
text:${input.raw.full_text.slice(0, 3500)}`;

  const extractJsonObject = (rawContent: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(rawContent);
    } catch {
      const fenced = rawContent.match(/```json\s*([\s\S]*?)```/i) || rawContent.match(/```\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch {
          /* continue */
        }
      }
      const first = rawContent.indexOf("{");
      const last = rawContent.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(rawContent.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(`[scrape-free] OpenAI ai_details HTTP ${response.status}: ${body.slice(0, 500)}`);
      return null;
    }
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      console.log("[scrape-free] OpenAI ai_details empty content");
      return null;
    }
    const parsed = extractJsonObject(rawContent);
    if (!parsed) {
      console.log(`[scrape-free] OpenAI ai_details invalid JSON: ${rawContent.slice(0, 500)}`);
      return null;
    }
    return sanitizeAiBoatDetails(parsed, input.boatType);
  } catch (e) {
    console.log(`[scrape-free] ai details generation failed for ${input.url}: ${e}`);
    return null;
  }
}

function normalizeBoatSegment(
  boatType: "sailboat" | "powerboat" | null,
  raw: string | null | undefined,
): BoatSegment | null {
  if (!boatType || !raw) return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (boatType === "sailboat") {
    if (["cruiser", "performance_cruiser", "racing", "catamaran", "luxury_cruiser"].includes(v)) {
      return v as BoatSegment;
    }
    return null;
  }
  if (["motor_cruiser", "flybridge", "sport_boat", "tender", "rib", "luxury_yacht"].includes(v)) {
    return v as BoatSegment;
  }
  return null;
}

async function classifyBoatSegmentWithAi(input: {
  url: string;
  boatType: "sailboat" | "powerboat" | null;
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
}): Promise<BoatSegment | null> {
  if (!OPENAI_API_KEY || !input.boatType) return null;
  const defaultSegment: BoatSegment = input.boatType === "sailboat" ? "cruiser" : "motor_cruiser";
  const systemPrompt = `Classify into one segment. Output JSON only: {"segment":"..."}.
Allowed segments:
- sailboat: cruiser, performance_cruiser, racing, catamaran, luxury_cruiser
- powerboat: motor_cruiser, flybridge, sport_boat, rib, luxury_yacht
Rules (strict, conservative):
- choose exactly one allowed segment for given type
- speed-focused => racing (sail) or sport_boat (power)
- luxury requires ALL: large size, very high equipment/comfort fitout, clear premium cues
- be extra strict for older boats: age alone never implies luxury; if older and evidence is weak, pick non-luxury
- if uncertain between luxury and non-luxury, choose non-luxury`;
  const userPrompt = `d:${JSON.stringify({
    type: input.boatType,
    link: input.url,
    core: input.core,
    specs: input.specs,
    description: input.raw.description,
    full_text: input.raw.full_text.slice(0, 3000),
  })}`;

  const extractJsonObject = (rawContent: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(rawContent);
    } catch {
      const fenced = rawContent.match(/```json\s*([\s\S]*?)```/i) || rawContent.match(/```\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch {
          /* continue */
        }
      }
      const first = rawContent.indexOf("{");
      const last = rawContent.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(rawContent.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(`[scrape-free] OpenAI segment HTTP ${response.status}: ${body.slice(0, 500)}`);
      return defaultSegment;
    }
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      console.log("[scrape-free] OpenAI segment empty content");
      return defaultSegment;
    }
    const parsed = extractJsonObject(rawContent);
    if (!parsed) {
      console.log(`[scrape-free] OpenAI segment invalid JSON: ${rawContent.slice(0, 500)}`);
      return defaultSegment;
    }
    return normalizeBoatSegment(input.boatType, typeof parsed?.segment === "string" ? parsed.segment : null) || defaultSegment;
  } catch (e) {
    console.log(`[scrape-free] segment classification failed for ${input.url}: ${e}`);
    return defaultSegment;
  }
}

function normalizeAiLocation(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  const parts = clean.split("->").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const [country, city] = parts;
  if (country.length < 2 || city.length < 2) return null;
  if (country.length > 60 || city.length > 80) return null;
  return `${country}->${city}`;
}

function normalizeAiBrandModel(raw: unknown): { brand: string | null; model: string | null } {
  const clean = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const out = v.replace(/\s+/g, " ").trim();
    if (!out || out.length < 2) return null;
    return out.slice(0, max);
  };
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    brand: clean(obj.brand, 120),
    model: clean(obj.model, 160),
  };
}

async function inferBrandModelWithAi(input: {
  url: string;
  currentBrand: string | null;
  currentModel: string | null;
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
}): Promise<{ brand: string | null; model: string | null } | null> {
  if (!OPENAI_API_KEY) return null;
  const systemPrompt = `Extract boat brand and model from listing data. Output JSON only:
{"brand":"...","model":"..."}
Rules:
- brand must be shipyard/manufacturer only (e.g. Beneteau, Jeanneau, Bavaria)
- model must be the marketed model designation (include series/variant when clear)
- keep values concise and normalized
- do not invent values; if uncertain return empty strings`;
  const userPrompt = `d:${JSON.stringify({
    link: input.url,
    current_brand: input.currentBrand,
    current_model: input.currentModel,
    core: input.core,
    specs: input.specs,
    description: input.raw.description,
    text: input.raw.full_text.slice(0, 2500),
  })}`;

  const extractJsonObject = (rawContent: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(rawContent);
    } catch {
      const first = rawContent.indexOf("{");
      const last = rawContent.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(rawContent.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") return null;
    const parsed = extractJsonObject(rawContent);
    if (!parsed) return null;
    return normalizeAiBrandModel(parsed);
  } catch {
    return null;
  }
}

async function inferLocationWithAi(input: {
  url: string;
  currentLocation: string | null;
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
}): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const systemPrompt = `Extract boat location. Output JSON only: {"location":"Country->City"}.
Rules:
- format strictly Country->City
- use best inferred country and city from listing text/specs
- no region, no postal code, no extra text
- if uncertain, return {"location":""}`;
  const userPrompt = `d:${JSON.stringify({
    link: input.url,
    current_location: input.currentLocation,
    core: input.core,
    specs: input.specs,
    description: input.raw.description,
    text: input.raw.full_text.slice(0, 2500),
  })}`;

  const extractJsonObject = (rawContent: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(rawContent);
    } catch {
      const first = rawContent.indexOf("{");
      const last = rawContent.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(rawContent.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") return null;
    const parsed = extractJsonObject(rawContent);
    if (!parsed) return null;
    return normalizeAiLocation(typeof parsed.location === "string" ? parsed.location : null);
  } catch {
    return null;
  }
}

function isSubsetOf(original: string[], candidate: string[]): boolean {
  const base = new Set(original.map((v) => v.trim()));
  return candidate.every((v) => base.has(v.trim()));
}

async function reviewImagesAndEquipmentWithAi(input: {
  url: string;
  site: string;
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
  image_urls: string[];
  equipment: string[];
}): Promise<{ image_urls: string[]; equipment: string[] } | null> {
  if (!OPENAI_API_KEY) return null;
  if (!["blocket.se", "findaly.co", "yachtall.com", "nautano.com", "boatshop24"].includes(input.site)) return null;
  if (input.image_urls.length === 0 && input.equipment.length === 0) return null;

  const systemPrompt = `You clean scraped listing media/equipment. Output JSON only:
{"image_urls":[],"equipment":[]}
Rules:
- Keep ONLY items that clearly belong to the listed boat ad.
- Remove UI/social/logo/banner/tracking/media-kit items.
- Remove equipment entries that are actions/navigation/contact/CTA or metadata.
- Remove category/navigation words like: popular, explore, all listings, pages, brands, models, countries.
- Remove strings that look like page titles/SEO headlines.
- Output must be strict subsets of provided arrays (do not invent/rewrite strings).
- Preserve original order from input arrays.`;

  const userPrompt = `d:${JSON.stringify({
    url: input.url,
    site: input.site,
    core: input.core,
    specs: input.specs,
    description: input.raw.description,
    text: input.raw.full_text.slice(0, 3000),
    image_urls: input.image_urls,
    equipment: input.equipment,
  })}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") return null;
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const aiImages = Array.isArray(parsed.image_urls) ? parsed.image_urls.filter((v) => typeof v === "string") : null;
    const aiEquipment = Array.isArray(parsed.equipment) ? parsed.equipment.filter((v) => typeof v === "string") : null;
    if (!aiImages || !aiEquipment) return null;
    if (!isSubsetOf(input.image_urls, aiImages) || !isSubsetOf(input.equipment, aiEquipment)) return null;
    return { image_urls: aiImages, equipment: aiEquipment };
  } catch {
    return null;
  }
}

// mornar.net: boat detail pages render a vertical content area with paragraph
// description and a feature/equipment table. We try common containers.
function extractMornar(html: string): { description: string | null; equipment: string[] } {
  let description: string | null = null;
  const equipment: string[] = [];

  // Best source: "EQUIPMENT AND DESCRIPTION" table block on listing detail pages.
  const eqHeaderIdx = html.search(/<th[^>]*>\s*EQUIPMENT AND DESCRIPTION\s*<\/th>/i);
  if (eqHeaderIdx >= 0) {
    const tableStart = html.lastIndexOf("<table", eqHeaderIdx);
    const tableEnd = html.indexOf("</table>", eqHeaderIdx);
    const eqTable =
      tableStart >= 0 && tableEnd > tableStart ? html.slice(tableStart, tableEnd + "</table>".length) : null;
    if (eqTable) {
    const tdMatch = eqTable.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    const contentBlock = tdMatch ? tdMatch[1] : eqTable;

    const formatted = htmlToReadableText(contentBlock);
    if (formatted.length > 40) description = formatted;

    equipment.push(...extractListItems(contentBlock, 120));
    }
  }

  // 1) Look for og:description as starter, but also try main content body
  const og = extractMeta(html, "og:description");
  if (!description) {
    // Try a richer block: the boat description usually sits inside a div whose
    // text is significantly longer than the surrounding chrome.
    const candidates: string[] = [];
    const reDiv = /<(?:div|p|td)[^>]*>([\s\S]{200,4000}?)<\/(?:div|p|td)>/gi;
    let m: RegExpExecArray | null;
    while ((m = reDiv.exec(html)) !== null) {
      const t = stripTags(m[1]);
      if (t.length > 200 && t.length < 4000 && !/cookie|sign in|search ads|menu|navigation/i.test(t)) {
        candidates.push(t);
      }
      if (candidates.length > 30) break;
    }
    // Pick the longest meaningful candidate
    candidates.sort((a, b) => b.length - a.length);
    if (candidates[0] && candidates[0].length > (og?.length || 0) + 80) {
      description = candidates[0];
    } else if (og && og.length > 30) {
      description = og;
    }
  }

  if (equipment.length === 0) {
    // Fallback heuristic: find a list near equipment keywords.
    const eqRe = /(?:Equipment|Inventory|Oprema|Inventar)[\s\S]{0,300}?<(ul|table)[^>]*>([\s\S]{0,15000}?)<\/\1>/i;
    const em = html.match(eqRe);
    if (em) {
      equipment.push(...extractListItems(em[2], 120));
      // tables: pull <td> cells too
      if (equipment.length === 0) {
        const tdRe = /<td[^>]*>([^<]{2,80})<\/td>/gi;
        let tm: RegExpExecArray | null;
        while ((tm = tdRe.exec(em[2])) !== null) {
          const t = stripTags(tm[1]).trim();
          if (t && t.length >= 2 && t.length <= 80) equipment.push(t);
          if (equipment.length >= 80) break;
        }
      }
    }
  }

  return { description, equipment };
}

function sanitizeListingImageUrls(images: string[], site: string, listingUrl?: string): string[] {
  if (!images || images.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const badTokenRe =
    /\b(logo|icon|sprite|placeholder|pixel|tracking|avatar|banner|ads?|advert|facebook|instagram|linkedin|youtube|favicon)\b/i;

  const siteSpecificRejectRe: Record<string, RegExp[]> = {
    "findaly.co": [/\/_next\/image/i, /\b(opengraph|og-image|twitter-image)\b/i],
    "yachtall.com": [/\b(breadcrumb|hero|header|footer|newsletter|hamburger)\b/i, /static\.yachtall\.com\/image\/layout\//i],
    "nautano.com": [/\b(default|fallback|no-image)\b/i],
    "boatshop24": [/\b(default|no-photo|not-available)\b/i],
    "blocket.se": [/\bstatic\/icons?\b/i],
  };

  let nautanoShipId: string | null = null;
  if (site === "nautano.com" && listingUrl) {
    const m = listingUrl.match(/\/ship\/([A-Za-z0-9-]+)/i);
    nautanoShipId = m?.[1] || null;
  }

  for (const raw of images) {
    const u = (raw || "").trim().replace(/(\.(?:jpe?g|png|webp))\1(?=\?|$)/i, "$1");
    if (!u) continue;
    if (!/^https?:\/\//i.test(u)) continue;
    if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u)) continue;
    if (badTokenRe.test(u)) continue;
    const rejects = siteSpecificRejectRe[site] || [];
    if (rejects.some((re) => re.test(u))) continue;
    if (site === "yachtall.com" && !/image\.yachtall\.com\/image\/(?:sboat|mboat)\//i.test(u)) continue;
    if (site === "findaly.co" && !/public\.blob\.vercel-storage\.com\/listings\//i.test(u)) continue;
    if (site === "nautano.com" && nautanoShipId && !new RegExp(`/${nautanoShipId}/`, "i").test(u)) continue;
    if (site === "nautano.com" && /_400\./i.test(u)) continue;

    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= 12) break;
  }
  return out;
}

function sanitizeEquipmentList(items: string[], site: string): string[] {
  if (!items || items.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  const genericReject = [
    /\b(buy|for sale)\b/i,
    /\b(contact|call|phone|message|whatsapp|email|seller|dealer)\b/i,
    /\b(share|print|save|favorite|report|cookie|privacy|terms)\b/i,
    /\b(similar boats?|related boats?|listing details?|description|specifications?|features?)\b/i,
    /\b(views?|watchlist|financing|insurance|delivery|transport)\b/i,
    /\b(photos?|images?|gallery|video|brochure|pdf)\b/i,
    /^(price|boat id|boat model|vat|currency)\s*:?$/i,
    /\b(vat|boat id|boat model)\b/i,
    /\b(€|\$|£)\s*\d/i,
    /^https?:\/\//i,
  ];

  const siteReject: Record<string, RegExp[]> = {
    "blocket.se": [/\b(spara|anmäl|dela|visa nummer|köp nu)\b/i],
    "findaly.co": [/\b(listing details?|discover|view listing|buy now|popular|explore|all listings|browse all|countries|brands|models|pages\.?|→)\b/i],
    "yachtall.com": [
      /\b(contact broker|send inquiry|book viewing|boat data|price:|updated in the last)\b/i,
      /^(manufacturer|boat type|boat category|category|year built)\s*:?$/i,
      /^[sm]\d{5,}$/i,
    ],
    "nautano.com": [/\b(show phone|ask question|send message)\b/i],
    boatshop24: [/\b(request price|ask dealer|dealer info)\b/i],
  };

  for (const raw of items) {
    const v = (raw || "")
      .replace(/\s+/g, " ")
      .replace(/^[•·\-\*\d\.\)\s]+/, "")
      .trim();
    if (!v) continue;
    if (v.length < 2 || v.length > 120) continue;
    if (!/[a-zA-Z]/.test(v)) continue;
    if (/^[\W_]+$/.test(v)) continue;
    if (genericReject.some((re) => re.test(v))) continue;
    if (site === "yachtall.com" && /:\s*$/.test(v)) continue;
    if (site === "yachtall.com") {
      const compact = v.toLowerCase().trim();
      if (
        /^(powerboat|sailboat|motor yacht|used boat|new boat|charter|boat|yacht)$/.test(compact) ||
        (!/,/.test(v) && !/\d/.test(v) && compact.split(/\s+/).length <= 3)
      ) {
        continue;
      }
    }
    if ((siteReject[site] || []).some((re) => re.test(v))) continue;

    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= 120) break;
  }
  return out;
}

async function validateListingDataWithAi(input: {
  url: string;
  site: string;
  parsed: ReturnType<typeof parseListing>;
}): Promise<Record<string, unknown> | null> {
  if (!OPENAI_API_KEY) return null;
  const systemPrompt = `Validate boat scrape quality. Output JSON only with keys:
{
  "overall_ok": boolean,
  "issues": [{"severity":"high|medium|low","field":"...","note":"..."}],
  "missing_but_present": [{"field":"...","evidence":"..."}],
  "suggested_fixes": ["..."]
}
Rules:
- Use only provided listing data.
- If a field seems missing but likely present in text/specs, include it in missing_but_present.
- Keep issues concise and technical.`;
  const userPrompt = `d:${JSON.stringify({
    url: input.url,
    site: input.site,
    title: input.parsed.title,
    brand: input.parsed.brand,
    model: input.parsed.model,
    price_eur: input.parsed.price_eur,
    year: input.parsed.year,
    length_feet: input.parsed.length_feet,
    boat_type: input.parsed.boat_type,
    location: input.parsed.location,
    image_urls: input.parsed.image_urls,
    equipment: input.parsed.equipment || [],
    specs_raw: input.parsed.specs_raw,
    flexible: input.parsed.flexible,
  })}`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") return null;
    return JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------- Parse a single listing into cached_listings shape ----------

function parseListing(
  html: string,
  url: string,
  site: string,
  hintType: "sailboat" | "powerboat" | "auto",
): {
  title: string;
  brand: string | null;
  model: string | null;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  boat_type: "sailboat" | "powerboat" | null;
  image_urls: string[];
  image_url: string | null;
  description: string | null;
  location: string | null;
  equipment: string[] | null;
  engine_hours: number | null;
  fuel_type: string | null;
  cabins: number | null;
  hull_material: string | null;
  engine_info: string | null;
  specs_raw: Record<string, unknown> | null;
  flexible: {
    core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
    specs: Record<string, unknown>;
    raw: { description: string; full_text: string };
  };
} {
  const text = stripTags(html);

  let title: string | null = extractMeta(html, "og:title");
  if (!title) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (t) title = decodeEntities(t[1]).trim();
  }
  if (!title) {
    const h = text.match(/(?:^|\n)#\s+([^\n]{3,140})/);
    if (h?.[1]) title = h[1].trim();
  }
  if (!title) {
    const tm = text.match(/(?:^|\n)Title:\s*([^\n]{3,160})/i);
    if (tm?.[1]) title = tm[1].trim();
  }
  if (title && /buy a sailboat|buy a motorboat|boats for sale/i.test(title)) {
    const fromUrl = url.match(/\/(?:boat|ship|yacht)\/([a-z0-9-]+)/i)?.[1];
    if (fromUrl) {
      title = fromUrl
        .replace(/-s\d{4,}$/i, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  let price: number | null = null;
  const lds = extractJsonLd(html);
  for (const block of lds) {
    const arr = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
    for (const ld of arr) {
      const offers = ld?.offers || ld;
      const p = offers?.price || offers?.priceSpecification?.price;
      const cur = offers?.priceCurrency || offers?.priceSpecification?.priceCurrency || "EUR";
      if (p) {
        const num = typeof p === "string" ? parseFloat(p.replace(/[^\d.]/g, "")) : Number(p);
        if (num > 0) {
          price = Math.round(num * (FX_TO_EUR[cur] ?? 1));
          break;
        }
      }
      if (ld?.name && !title) title = ld.name;
    }
    if (price !== null) break;
  }
  if (price === null) price = parsePriceWithCurrency(text).eur;

  const year = parseYear(text);
  let length_feet = parseLengthFeet(text);
  let images = extractImages(html, url, 8, site);
  images = sanitizeListingImageUrls(images, site, url).slice(0, 5);
  const boat_type = detectBoatType(text, url, hintType);

  // Site-specific RICH extraction for description + equipment
  let description: string | null = null;
  let equipment: string[] = [];
  let featureMap: Record<string, string> = {};
  if (site === "boat24.com") {
    const r = extractBoat24(html);
    description = r.description;
    equipment = r.equipment;
    featureMap = { ...extractFeatureMapFromHtml(html), ...r.featureMap };
  } else if (site === "trovobarche.it") {
    const r = extractTrovobarche(html);
    description = r.description;
    equipment = r.equipment;
    featureMap = r.featureMap;
    // Trovobarche often stores length in structured features, not in free text.
    if (!length_feet) {
      length_feet = parseLengthFromFeatureMap(r.featureMap);
    }
    if (!length_feet) {
      length_feet = parseLengthFromLabeledText(text);
    }
  } else if (site === "mornar.net") {
    const r = extractMornar(html);
    description = r.description;
    equipment = r.equipment;
    featureMap = extractFeatureMapFromHtml(html);
  } else if (site === "scanboat.com") {
    featureMap = {
      ...extractFeatureMapFromHtml(html),
      ...extractScanboatSpecifications(text),
    };
    description = extractScanboatDescriptionFromText(text);
    // Scanboat often provides "Length 13.76" in spec blocks without inline "m/ft" in prose.
    if (!length_feet) {
      length_feet = parseLengthFromFeatureMap(featureMap);
    }
    if (!length_feet) {
      length_feet = parseLengthFromLabeledText(text);
    }
    if (!length_feet) {
      const rawLen = findFeatureValue(featureMap, /\blength\b/i);
      const numericLen = rawLen ? parseNumber(rawLen) : null;
      // Scanboat "Length" values are typically meters when no unit is shown.
      if (numericLen && numericLen > 3 && numericLen < 50) {
        length_feet = Math.round(numericLen * 3.281 * 10) / 10;
      }
    }
    if (!length_feet) {
      const m = text.match(/\bLength\s+(\d{1,2}(?:[.,]\d{1,2})?)\b/i);
      const numericLen = m?.[1] ? parseNumber(m[1]) : null;
      if (numericLen && numericLen > 3 && numericLen < 50) {
        length_feet = Math.round(numericLen * 3.281 * 10) / 10;
      }
    }
  } else if (
    site === "blocket.se" ||
    site === "findaly.co" ||
    site === "yachtall.com" ||
    site === "nautano.com" ||
    site === "boatshop24"
  ) {
    const r = extractMarketplaceSections(html, text);
    description = r.description;
    equipment = r.equipment;
    featureMap = r.featureMap;
    if (site === "blocket.se") {
      const b = extractBlocket(text);
      description = b.description || description;
      equipment = [...equipment, ...b.equipment];
      featureMap = { ...featureMap, ...b.featureMap };
    }
    if (site === "findaly.co") {
      const f = extractFindaly(text);
      description = f.description || description;
      equipment = [...equipment, ...f.equipment];
      featureMap = { ...featureMap, ...f.featureMap };
    }
    if (!length_feet) {
      length_feet = parseLengthFromFeatureMap(featureMap);
    }
    if (!length_feet) {
      length_feet = parseLengthFromLabeledText(text);
    }
    if (site === "nautano.com") {
      const strictLength = parseLengthFromFeatureMap(featureMap);
      if (strictLength) length_feet = strictLength;
    }
  }
  // Fallback to og:description if site-specific extraction failed
  if (!description) {
    description = extractMeta(html, "og:description") || extractMeta(html, "description");
  }
  description = normalizeDescriptionLayout(description);
  // Cap description length to avoid bloating the DB
  if (description && description.length > 5000) description = description.slice(0, 5000) + "…";
  equipment = sanitizeEquipmentList(equipment, site);

  // Location heuristics per site
  let location: string | null = null;
  if (site === "boat24.com") {
    // Prefer explicit JSON-LD / structured keys first, then fallback.
    const prioritizedKeys = [
      "location",
      "country",
      "countryname",
      "addresscountry",
      "addresslocality",
      "region",
      "regionname",
      "place",
    ];
    for (const k of prioritizedKeys) {
      const v = normalizeLocationValue(featureMap[k]);
      if (v) {
        location = v;
        break;
      }
    }
    if (!location) {
      const structuredLocation = findFeatureValue(
        featureMap,
        /\b(location|standort|posizione|lokacija|country|region|place)\b/i,
      );
      location = normalizeLocationValue(structuredLocation);
    }
  } else {
    const locM = text.match(/(?:location|standort|posizione|lokacija|località)[\s:]+([^.\n,|]{3,80})/i);
    if (locM) location = normalizeLocationValue(locM[1]);
    if (!location && site === "trovobarche.it") {
      location = normalizeLocationValue(extractTrovobarcheCity(html, featureMap));
    }
  }

  const rich = extractRichFields(text, featureMap);
  const { brand, model } = deriveBrandModel(title, featureMap);

  const recentWork = extractRecentWorkFromListing(text, featureMap, equipment.length > 0 ? equipment : null, site);

  const specsRaw =
    sanitizeSpecsRaw(featureMap) ||
    buildSpecsRawFallback({
      year,
      length_feet,
      engine_info: rich.engine_info,
      engine_hours: rich.engine_hours,
      fuel_type: rich.fuel_type,
      cabins: rich.cabins,
      hull_material: rich.hull_material,
      location,
    });
  const specsRawWithSections: Record<string, unknown> | null = {
    ...(specsRaw && typeof specsRaw === "object" ? specsRaw : {}),
    equipment: equipment.length > 0 ? equipment : [],
    recent_work: recentWork.length > 0 ? recentWork : null,
    image_urls: images,
  };

  const dynamicSpecs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(featureMap)) {
    mergeSpec(dynamicSpecs, k, v);
  }
  mergeSpec(dynamicSpecs, "brand", brand);
  mergeSpec(dynamicSpecs, "model", model);
  mergeSpec(dynamicSpecs, "type", boat_type);
  mergeSpec(dynamicSpecs, "boat_type", boat_type);
  mergeSpec(dynamicSpecs, "engine_hours", rich.engine_hours);
  mergeSpec(dynamicSpecs, "fuel_type", rich.fuel_type);
  mergeSpec(dynamicSpecs, "cabins", rich.cabins);
  mergeSpec(dynamicSpecs, "hull_material", rich.hull_material);
  mergeSpec(dynamicSpecs, "engine_info", rich.engine_info);
  mergeSpec(dynamicSpecs, "equipment", equipment.length > 0 ? equipment : null);
  mergeSpec(dynamicSpecs, "recent_work", recentWork.length > 0 ? recentWork : null);
  mergeSpec(dynamicSpecs, "image_urls", images);
  const standardizedSpecs = withStandardSpecSections(dynamicSpecs);
  const qualityMeta = buildFieldQualityMeta({
    site,
    brand,
    model,
    rich,
    equipment,
    recentWork,
    images,
    location,
    featureMap,
  });
  standardizedSpecs.field_confidence = qualityMeta.confidence;
  standardizedSpecs.field_source = qualityMeta.source;

  const flexible = buildFlexibleListingOutput({
    title: (title || url).slice(0, 250),
    price_eur: price,
    year,
    length_feet,
    location,
    description: description || null,
    full_text: text,
    dynamicSpecs: standardizedSpecs,
  });

  return {
    title: (title || url).slice(0, 250),
    brand,
    model,
    price_eur: price,
    year,
    length_feet,
    boat_type,
    image_urls: images,
    image_url: images[0] || null,
    description: description || null,
    location,
    equipment: equipment.length > 0 ? equipment : null,
    engine_hours: rich.engine_hours,
    fuel_type: rich.fuel_type,
    cabins: rich.cabins,
    hull_material: rich.hull_material,
    engine_info: rich.engine_info,
    specs_raw: specsRawWithSections,
    flexible,
  };
}

function isCompleteListingForIngest(parsed: ReturnType<typeof parseListing>): boolean {
  const core = parsed.flexible.core;
  const specs = parsed.flexible.specs || {};
  const raw = parsed.flexible.raw || { description: "", full_text: "" };

  // Hard quality gate requested by user:
  // reject listings that are not fully scraped.
  if (!core.title || core.title.trim().length < 8) return false;
  if (!parsed.boat_type) return false;
  if (core.price_eur === null || core.price_eur <= 0) return false;
  if (core.year === null || core.year < 1950) return false;
  if (core.length_m === null || core.length_m < 3 || core.length_m > 60) return false;
  if (!raw.description || raw.description.trim().length < 80) return false;
  if (!raw.full_text || raw.full_text.trim().length < 300) return false;
  if (!parsed.image_urls || parsed.image_urls.length < 1) return false;

  // Ensure we actually captured structured listing details.
  const meaningfulSpecKeys = Object.keys(specs).filter((k) => {
    if (k === "ai_details") return false;
    const v = (specs as Record<string, unknown>)[k];
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  });
  if (meaningfulSpecKeys.length < 3) return false;

  return true;
}

// ---------- Persistence ----------

async function upsertListing(
  supabaseUrl: string,
  supabaseKey: string,
  row: Record<string, any>,
  retryCount = 2,
): Promise<"insert" | "update" | "skip" | "error"> {
  // Quality gate: require price OR (year AND length) — same as scrape-listings-cron
  if (!row.price_eur && !(row.year && row.length_feet)) return "skip";

  try {
    // Try update first
    const patch = await withRetry(
      async () =>
        await fetch(`${supabaseUrl}/rest/v1/cached_listings?url=eq.${encodeURIComponent(row.url)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(row),
        }),
      { retries: retryCount, baseDelayMs: 220, maxDelayMs: 1800 },
    );
    if (!patch.ok) return "error";
    const patched = await patch.json();
    if (Array.isArray(patched) && patched.length > 0) return "update";

    // Insert if no row
    const ins = await withRetry(
      async () =>
        await fetch(`${supabaseUrl}/rest/v1/cached_listings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(row),
        }),
      { retries: retryCount, baseDelayMs: 260, maxDelayMs: 2200 },
    );
    return ins.ok ? "insert" : "error";
  } catch {
    return "error";
  }
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Defaults: scan ALL categories, but bound listings per page so we stay under timeout.
  let categoryStart = 0;
  let categoryEnd = CATEGORY_PAGES.length;
  let maxListingsPerPage = 8;
  let listingConcurrency = 4;
  let pageConcurrency = 2;
  let fetchRetries = 2;
  let upsertRetries = 2;
  let enableAiMediaReview = false;
  let enableAiDataValidation = false;
  let enableAiBrandModel = true;
  let pageStart = 1;
  let pageEnd: number | null = null;
  let requestedUrls: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.categoryStart === "number") categoryStart = body.categoryStart;
    if (typeof body.categoryEnd === "number") categoryEnd = body.categoryEnd;
    if (typeof body.maxListingsPerPage === "number") maxListingsPerPage = body.maxListingsPerPage;
    if (typeof body.listingConcurrency === "number") listingConcurrency = Math.max(1, Math.floor(body.listingConcurrency));
    if (typeof body.pageConcurrency === "number") pageConcurrency = Math.max(1, Math.floor(body.pageConcurrency));
    if (typeof body.fetchRetries === "number") fetchRetries = Math.max(0, Math.floor(body.fetchRetries));
    if (typeof body.upsertRetries === "number") upsertRetries = Math.max(0, Math.floor(body.upsertRetries));
    if (typeof body.enableAiMediaReview === "boolean") enableAiMediaReview = body.enableAiMediaReview;
    if (typeof body.enableAiDataValidation === "boolean") enableAiDataValidation = body.enableAiDataValidation;
    if (typeof body.enableAiBrandModel === "boolean") enableAiBrandModel = body.enableAiBrandModel;
    if (typeof body.pageStart === "number") pageStart = Math.max(1, Math.floor(body.pageStart));
    if (typeof body.pageEnd === "number") pageEnd = Math.max(1, Math.floor(body.pageEnd));
    if (Array.isArray(body.urls)) {
      requestedUrls = body.urls.filter((u: unknown): u is string => typeof u === "string" && u.length > 10);
    }
  } catch {}

  const stats = { categoriesProcessed: 0, listingsFound: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const samples: string[] = [];
  const targetedResults: Array<{
    url: string;
    data: any;
    status: "insert" | "update" | "skip" | "error";
    source: "scrape-free";
  }> = [];

  const perSiteTimeoutMs = (site: string): number => {
    if (site === "trovobarche.it") return 14000;
    if (site === "boat24.com") return 17000;
    if (site === "scanboat.com") return 14000;
    if (site === "boatshop24") return 15000;
    if (site === "nautano.com" || site === "yachtall.com" || site === "findaly.co") return 14000;
    return 10000;
  };

  const processListingUrl = async (
    linkUrl: string,
    site: string,
    hintType: "sailboat" | "powerboat" | "auto",
  ) => {
    try {
      const html = await withRetry(
        async () => {
          const content = await fetchHtml(linkUrl, perSiteTimeoutMs(site));
          if (!content) throw new Error("empty listing html");
          return content;
        },
        { retries: fetchRetries, baseDelayMs: 280, maxDelayMs: 2200 },
      );
      if (!html) {
        stats.errors++;
        return;
      }
      let parsed = parseListing(html, linkUrl, site, hintType);
      if (site === "boat24.com" && !parsed.location) {
        const proxyLocation = await fetchBoat24LocationViaProxy(linkUrl, 10000);
        if (proxyLocation) parsed = { ...parsed, location: proxyLocation };
      }
      if (enableAiMediaReview) {
        const aiReview = await reviewImagesAndEquipmentWithAi({
          url: linkUrl,
          site,
          core: parsed.flexible.core,
          specs: parsed.flexible.specs,
          raw: parsed.flexible.raw,
          image_urls: parsed.image_urls,
          equipment: parsed.equipment || [],
        });
        if (aiReview) {
          parsed = {
            ...parsed,
            image_urls: aiReview.image_urls,
            image_url: aiReview.image_urls[0] || null,
            equipment: aiReview.equipment.length > 0 ? aiReview.equipment : null,
            flexible: {
              ...parsed.flexible,
              specs: {
                ...parsed.flexible.specs,
                image_urls: aiReview.image_urls,
                equipment: aiReview.equipment.length > 0 ? aiReview.equipment : null,
              },
            },
          };
        }
      }

      if (
        site === "trovobarche.it" &&
        parsed.description &&
        /\.\.\./.test(parsed.description)
      ) {
          const proxyHtml = await fetchHtmlViaProxy(linkUrl, 10000);
        if (proxyHtml) {
          const proxyParsed = parseListing(proxyHtml, linkUrl, site, hintType);
          if (
            proxyParsed.description &&
            proxyParsed.description.length > parsed.description.length + 40
          ) {
            parsed = { ...parsed, description: proxyParsed.description };
          }
        }
      }

      if (!isCompleteListingForIngest(parsed)) {
        stats.skipped++;
        if (requestedUrls.length > 0) {
          targetedResults.push({ url: linkUrl, data: parsed.flexible, status: "skip", source: "scrape-free" });
        }
        return;
      }

      const row = {
        url: linkUrl,
        title: parsed.title || linkUrl,
        brand: parsed.brand,
        model: parsed.model,
        source: site,
        boat_type: parsed.boat_type,
        segment: null as string | null,
        price_eur: parsed.price_eur,
        year: parsed.year,
        length_feet: parsed.length_feet,
        image_url: parsed.image_url,
        image_urls: parsed.image_urls.length > 0 ? parsed.image_urls : null,
        description: parsed.description,
        equipment: parsed.equipment,
        location: parsed.location,
        engine_hours: parsed.engine_hours,
        fuel_type: parsed.fuel_type,
        cabins: parsed.cabins,
        hull_material: parsed.hull_material,
        engine_info: parsed.engine_info,
        specs_raw: parsed.specs_raw,
        scraped_at: new Date().toISOString(),
      };
      if (enableAiBrandModel) {
        const aiBrandModel = await inferBrandModelWithAi({
          url: linkUrl,
          currentBrand: parsed.brand,
          currentModel: parsed.model,
          core: parsed.flexible.core,
          specs: parsed.flexible.specs,
          raw: parsed.flexible.raw,
        });
        if (aiBrandModel?.brand) {
          row.brand = aiBrandModel.brand;
          mergeSpec(parsed.flexible.specs, "brand", aiBrandModel.brand);
        }
        if (aiBrandModel?.model) {
          row.model = aiBrandModel.model;
          mergeSpec(parsed.flexible.specs, "model", aiBrandModel.model);
        }
      }
      const aiDetails = await generateAiBoatDetails({
        url: linkUrl,
        boatType: parsed.boat_type,
        core: parsed.flexible.core,
        specs: parsed.flexible.specs,
        raw: parsed.flexible.raw,
      });
      if (!aiDetails) {
        // Hard gate: if we cannot build evaluation payload, skip persistence.
        stats.skipped++;
        if (requestedUrls.length > 0) {
          targetedResults.push({ url: linkUrl, data: parsed.flexible, status: "skip", source: "scrape-free" });
        }
        return;
      }
      row.specs_raw = {
        ...(row.specs_raw && typeof row.specs_raw === "object" ? row.specs_raw : {}),
        ai_details: aiDetails,
      };
      parsed.flexible.specs.ai_details = aiDetails;
      const segment = await classifyBoatSegmentWithAi({
        url: linkUrl,
        boatType: parsed.boat_type,
        core: parsed.flexible.core,
        specs: parsed.flexible.specs,
        raw: parsed.flexible.raw,
      });
      if (segment) {
        row.segment = segment;
        mergeSpec(parsed.flexible.specs, "segment", segment);
        mergeSpec(parsed.flexible.specs, "type", parsed.boat_type);
      }
      const aiLocation = await inferLocationWithAi({
        url: linkUrl,
        currentLocation: parsed.location || parsed.flexible.core.location,
        core: parsed.flexible.core,
        specs: parsed.flexible.specs,
        raw: parsed.flexible.raw,
      });
      if (!aiLocation) {
        // Hard gate: persist only listings with AI-resolved location.
        stats.skipped++;
        if (requestedUrls.length > 0) {
          targetedResults.push({ url: linkUrl, data: parsed.flexible, status: "skip", source: "scrape-free" });
        }
        return;
      }
      row.location = aiLocation;
      parsed.flexible.core.location = aiLocation;
      mergeSpec(parsed.flexible.specs, "location", aiLocation);
      if (enableAiDataValidation) {
        const validation = await validateListingDataWithAi({ url: linkUrl, site, parsed });
        if (validation) {
          row.specs_raw = {
            ...(row.specs_raw && typeof row.specs_raw === "object" ? row.specs_raw : {}),
            ai_validation: validation,
          };
          parsed.flexible.specs.ai_validation = validation;
        }
      }
      const r = await upsertListing(supabaseUrl, supabaseKey, row, upsertRetries);
      if (r === "insert") {
        stats.inserted++;
        if (samples.length < 5) samples.push(`+ ${linkUrl}`);
      } else if (r === "update") stats.updated++;
      else if (r === "skip") stats.skipped++;
      else stats.errors++;
      if (requestedUrls.length > 0) {
        targetedResults.push({ url: linkUrl, data: parsed.flexible, status: r, source: "scrape-free" });
      }
    } catch (e) {
      console.log(`[scrape-free] listing error ${linkUrl}: ${e}`);
      stats.errors++;
      if (requestedUrls.length > 0) {
        targetedResults.push({
          url: linkUrl,
          data: {
            core: { title: "Unknown listing", price_eur: null, year: null, length_m: null, location: null },
            specs: {},
            raw: { description: "", full_text: "" },
          },
          status: "error",
          source: "scrape-free",
        });
      }
    }
  };

  if (requestedUrls.length > 0) {
    stats.listingsFound = requestedUrls.length;
    await runWithConcurrency(requestedUrls, listingConcurrency, async (u) => {
      let site = "";
      try {
        const h = new URL(u).hostname.replace("www.", "").replace("www2.", "");
        if (h.includes("trovobarche.it")) site = "trovobarche.it";
        else if (h.includes("mornar.net")) site = "mornar.net";
        else if (h.includes("boat24.com")) site = "boat24.com";
        else if (h.includes("scanboat.com")) site = "scanboat.com";
        else if (h.includes("blocket.se")) site = "blocket.se";
        else if (h.includes("findaly.co")) site = "findaly.co";
        else if (h.includes("yachtall.com")) site = "yachtall.com";
        else if (h.includes("nautano.com")) site = "nautano.com";
        else if (h.includes("boatshop24")) site = "boatshop24";
      } catch {
        /* ignore */
      }
      if (!site) {
        stats.errors++;
        return;
      }
      const lowerUrl = u.toLowerCase();
      const hintType: "sailboat" | "powerboat" | "auto" =
        /\/(?:jadrnice|sail|sailboats?|vela|catamaran|voilier)\b/.test(lowerUrl)
          ? "sailboat"
          : /\/(?:motornaplovila|motor-boats?|motorboats?|power|powerboats?|motoryacht|flybridge|rib)\b/.test(lowerUrl)
            ? "powerboat"
            : "auto";
      await processListingUrl(u, site, hintType);
    });

    console.log(`[scrape-free] targeted done`, stats);
    const single = requestedUrls.length === 1 ? targetedResults[0] : null;
    return new Response(JSON.stringify({
      success: true,
      data: single ? single.data : targetedResults.map((r) => r.data),
      source: single ? single.source : "scrape-free",
      status: single ? single.status : null,
      stats,
      samples,
      results: targetedResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cats = CATEGORY_PAGES.slice(categoryStart, categoryEnd);
  console.log(
    `[scrape-free] starting: ${cats.length} categories, maxListingsPerPage=${maxListingsPerPage}, listingConcurrency=${listingConcurrency}, pageConcurrency=${pageConcurrency}, fetchRetries=${fetchRetries}, upsertRetries=${upsertRetries}`,
  );

  for (const cat of cats) {
    stats.categoriesProcessed++;
    const startPage = Math.min(pageStart, cat.pages);
    const endPage = Math.max(startPage, Math.min(pageEnd ?? cat.pages, cat.pages));

    const pagesToProcess: number[] = [];
    for (let page = startPage; page <= endPage; page++) pagesToProcess.push(page);

    await runWithConcurrency(pagesToProcess, pageConcurrency, async (page) => {
      const catUrl = cat.buildUrl(page);
      console.log(`[scrape-free] ${cat.site} p${page}: ${catUrl}`);
      let indexHtml: string | null = null;
      try {
        indexHtml = await withRetry(
          async () => {
            const content = await fetchHtml(catUrl, perSiteTimeoutMs(cat.site));
            if (!content) throw new Error("empty category html");
            return content;
          },
          { retries: fetchRetries, baseDelayMs: 320, maxDelayMs: 2600 },
        );
      } catch {
        indexHtml = null;
      }
      if (!indexHtml) {
        console.log(`[scrape-free] failed to fetch index ${catUrl}`);
        stats.errors++;
        return;
      }
      let links = extractListingLinks(indexHtml, catUrl, cat.site);
      if (cat.titleFilter) links = links.filter((l) => cat.titleFilter!(l.title));
      if (cat.site === "findaly.co") {
        if (cat.boatType === "sailboat") {
          links = links.filter((l) => !/\bmy\d|motor|motoryacht\b/i.test(l.title));
        } else if (cat.boatType === "powerboat") {
          links = links.filter((l) => /\bmy\d|motor|motoryacht|fly\b/i.test(l.title));
        }
      }
      if (cat.site === "scanboat.com") {
        if (cat.boatType === "sailboat") {
          links = links.filter((l) => /\/sailingboat-/i.test(l.url));
        } else if (cat.boatType === "powerboat") {
          links = links.filter((l) => /\/motorboat-/i.test(l.url));
        }
      }
      links = links.slice(0, maxListingsPerPage);
      stats.listingsFound += links.length;
      console.log(`[scrape-free] ${cat.site} p${page}: ${links.length} listings to process`);

      await runWithConcurrency(links, listingConcurrency, async (link) => {
        await processListingUrl(link.url, cat.site, cat.boatType);
      });
    });
  }

  console.log(`[scrape-free] done`, stats);
  return new Response(JSON.stringify({ success: true, stats, samples }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

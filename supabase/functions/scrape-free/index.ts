// Firecrawl-free scraper. Mirrors the rules of `scrape-listings-cron` (same sources,
// same URL validation, same boat-type detection) but uses direct HTTP fetch + r.jina.ai
// fallback instead of Firecrawl, so it costs zero credits and can run frequently.
//
// Sources covered: mornar.net (sail+power), subito.it (with title filter), boat24.com (sail+power).
// Pagination matches the existing CATEGORY_PAGES config.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Sources (same rules as scrape-listings-cron CATEGORY_PAGES) ----------

const SUBITO_BOAT_KEYWORDS = [
  "barca",
  "vela",
  "yacht",
  "gommone",
  "cabinato",
  "gozzo",
  "natante",
  "motoscafo",
  "veliero",
  "catamarano",
  "bavaria",
  "beneteau",
  "jeanneau",
  "hanse",
  "dufour",
  "elan",
  "azimut",
  "sessa",
  "cranchi",
  "sea ray",
  "quicksilver",
  "fairline",
  "princess",
  "sunseeker",
  "lagoon",
  "fountaine pajot",
  "saxdor",
  "axopar",
  "nimbus",
  "galeon",
  "prestige",
  "merry fisher",
  "antares",
  "oceanis",
  "sun odyssey",
  "first ",
  "hallberg",
];
const isLikelyBoatTitle = (title: string): boolean => {
  const t = title.toLowerCase();
  return SUBITO_BOAT_KEYWORDS.some((k) => t.includes(k));
};

type CategoryPage = {
  site: string;
  buildUrl: (page: number) => string;
  boatType: "sailboat" | "powerboat" | "auto";
  pages: number;
  titleFilter?: (title: string) => boolean;
};

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
    site: "subito.it",
    buildUrl: (page) =>
      page === 1
        ? `https://www.subito.it/annunci-italia/vendita/nautica/?q=barca`
        : `https://www.subito.it/annunci-italia/vendita/nautica/?q=barca&o=${page}`,
    boatType: "auto",
    pages: 10,
    titleFilter: isLikelyBoatTitle,
  },
  {
    site: "boat24.com",
    // boat24 uses offset pagination: page 2 = ?page=20, page 3 = ?page=40, page 8 = ?page=140
    buildUrl: (page) =>
      page === 1
        ? `https://www.boat24.com/en/sailboats/`
        : `https://www.boat24.com/en/sailboats/?page=${(page - 1) * 20}`,
    boatType: "sailboat",
    pages: 10,
  },
  {
    site: "boat24.com",
    buildUrl: (page) =>
      page === 1
        ? `https://www.boat24.com/en/usedboats/?cat=2&sort=datdesc`
        : `https://www.boat24.com/en/usedboats/?cat=2&sort=datdesc?page=${(page - 1) * 20}`,
    boatType: "powerboat",
    pages: 10,
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
  if (hostname.includes("mornar.net")) {
    return (/\/[Ss]how\/boat\.asp/i.test(url) && /ID=\d+/i.test(url)) || /\/oglas[a-z\-]*\/\d+/i.test(url);
  }
  if (hostname.includes("subito.it")) {
    if (!/\.htm/i.test(url)) return false;
    if (/\/annunci-\w+\/vendita\/[^/]+\/?$/i.test(url)) return false;
    return /\d{6,}\.htm/i.test(url);
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
  const f = text.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(ft|feet|foot)\b/i);
  if (f) {
    const ft = parseFloat(f[1].replace(",", "."));
    if (ft > 10 && ft < 200) return Math.round(ft * 10) / 10;
  }
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

function detectBoatType(
  text: string,
  url: string,
  fallback: "sailboat" | "powerboat" | "auto",
): "sailboat" | "powerboat" {
  const u = (url + " " + text).toLowerCase();
  if (/\b(sailboat|sailing|segelboot|segelyacht|veliero|barca a vela|jedrilica|voilier|velero)\b/.test(u))
    return "sailboat";
  if (/\b(powerboat|motorboat|motoryacht|motorboot|barca a motore|gliser|motoryacht)\b/.test(u)) return "powerboat";
  if (/\b(mainsail|genoa|spinnaker|jib|mast|rigging)\b/.test(u)) return "sailboat";
  if (/\b(outboard|sterndrive|jet drive|planing|fuoribordo|entrobordo)\b/.test(u)) return "powerboat";
  if (fallback === "auto") return "sailboat";
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

function extractImages(html: string, baseUrl: string, max = 5, site?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  };

  const og = extractMeta(html, "og:image");
  if (og) push(resolveUrl(og, baseUrl));
  const re = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+\.(?:jpe?g|png|webp))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = resolveUrl(m[1], baseUrl);
    if (/\b(logo|icon|sprite|placeholder|pixel|tracking|favicon|avatar)\b/i.test(u)) continue;
    push(u);
    if (out.length >= max + 5) break;
  }

  // mornar.net: first image on listing pages is the site header logo banner — drop it.
  let result = out;
  if (site === "mornar.net" && result.length > 1) {
    result = result.slice(1);
  }
  return result.slice(0, max);
}

// ---------- Fetch with proxy fallback ----------

const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,it;q=0.8,de;q=0.7,hr;q=0.6",
  "Accept-Encoding": "gzip, deflate",
};

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
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

  // Fallback: r.jina.ai proxy (free, returns rendered HTML)
  try {
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), timeoutMs);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": browserHeaders["User-Agent"], "X-Return-Format": "html" },
      signal: ctrl2.signal,
    });
    clearTimeout(t2);
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 500) return html;
    }
  } catch {
    /* give up */
  }
  return null;
}

// ---------- Extract listing links from a category page ----------

function extractListingLinks(html: string, baseUrl: string, site: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = resolveUrl(m[1], baseUrl);
    if (seen.has(href)) continue;
    if (!isValidListingUrl(href, site)) continue;
    seen.add(href);
    const title = stripTags(m[2]).slice(0, 200);
    out.push({ url: href, title });
  }
  return out;
}

// ---------- Parse a single listing into cached_listings shape ----------

function parseListing(
  html: string,
  url: string,
  site: string,
  hintType: "sailboat" | "powerboat" | "auto",
): {
  title: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  boat_type: "sailboat" | "powerboat";
  image_urls: string[];
  image_url: string | null;
  description: string | null;
  location: string | null;
} {
  const text = stripTags(html);

  let title: string | null = extractMeta(html, "og:title");
  if (!title) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (t) title = decodeEntities(t[1]).trim();
  }

  const description = extractMeta(html, "og:description") || extractMeta(html, "description");
  let price: number | null = null;
  const lds = extractJsonLd(html);
  for (const ld of lds) {
    const offers = ld.offers || ld;
    const p = offers?.price || offers?.priceSpecification?.price;
    const cur = offers?.priceCurrency || offers?.priceSpecification?.priceCurrency || "EUR";
    if (p) {
      const num = typeof p === "string" ? parseFloat(p.replace(/[^\d.]/g, "")) : Number(p);
      if (num > 0) {
        price = Math.round(num * (FX_TO_EUR[cur] ?? 1));
        break;
      }
    }
    if (ld.name && !title) title = ld.name;
  }
  if (price === null) price = parsePriceWithCurrency(text).eur;

  const year = parseYear(text);
  const length_feet = parseLengthFeet(text);
  const images = extractImages(html, url, 5, site);
  const boat_type = detectBoatType(text, url, hintType);

  // Location heuristics per site
  let location: string | null = null;
  const locM = text.match(/(?:location|standort|posizione|lokacija|località)[\s:]+([^.\n,|]{3,80})/i);
  if (locM) location = locM[1].trim();

  return {
    title: (title || url).slice(0, 250),
    price_eur: price,
    year,
    length_feet,
    boat_type,
    image_urls: images,
    image_url: images[0] || null,
    description: description || null,
    location,
  };
}

// ---------- Persistence ----------

async function upsertListing(
  supabaseUrl: string,
  supabaseKey: string,
  row: Record<string, any>,
): Promise<"insert" | "update" | "skip" | "error"> {
  // Quality gate: require price OR (year AND length) — same as scrape-listings-cron
  if (!row.price_eur && !(row.year && row.length_feet)) return "skip";

  try {
    // Try update first
    const patch = await fetch(`${supabaseUrl}/rest/v1/cached_listings?url=eq.${encodeURIComponent(row.url)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });
    if (!patch.ok) return "error";
    const patched = await patch.json();
    if (Array.isArray(patched) && patched.length > 0) return "update";

    // Insert if no row
    const ins = await fetch(`${supabaseUrl}/rest/v1/cached_listings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
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
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.categoryStart === "number") categoryStart = body.categoryStart;
    if (typeof body.categoryEnd === "number") categoryEnd = body.categoryEnd;
    if (typeof body.maxListingsPerPage === "number") maxListingsPerPage = body.maxListingsPerPage;
  } catch {}

  const stats = { categoriesProcessed: 0, listingsFound: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const samples: string[] = [];

  const cats = CATEGORY_PAGES.slice(categoryStart, categoryEnd);
  console.log(`[scrape-free] starting: ${cats.length} categories, maxListingsPerPage=${maxListingsPerPage}`);

  for (const cat of cats) {
    stats.categoriesProcessed++;
    for (let page = 1; page <= cat.pages; page++) {
      const catUrl = cat.buildUrl(page);
      console.log(`[scrape-free] ${cat.site} p${page}: ${catUrl}`);
      const indexHtml = await fetchHtml(catUrl);
      if (!indexHtml) {
        console.log(`[scrape-free] failed to fetch index ${catUrl}`);
        stats.errors++;
        continue;
      }
      let links = extractListingLinks(indexHtml, catUrl, cat.site);
      if (cat.titleFilter) links = links.filter((l) => cat.titleFilter!(l.title));
      links = links.slice(0, maxListingsPerPage);
      stats.listingsFound += links.length;
      console.log(`[scrape-free] ${cat.site} p${page}: ${links.length} listings to process`);

      for (const link of links) {
        try {
          const html = await fetchHtml(link.url, 12000);
          if (!html) {
            stats.errors++;
            continue;
          }
          const parsed = parseListing(html, link.url, cat.site, cat.boatType);
          const row = {
            url: link.url,
            title: parsed.title || link.title || link.url,
            source: cat.site,
            boat_type: parsed.boat_type,
            price_eur: parsed.price_eur,
            year: parsed.year,
            length_feet: parsed.length_feet,
            image_url: parsed.image_url,
            image_urls: parsed.image_urls.length > 0 ? parsed.image_urls : null,
            description: parsed.description,
            location: parsed.location,
            scraped_at: new Date().toISOString(),
          };
          const r = await upsertListing(supabaseUrl, supabaseKey, row);
          if (r === "insert") {
            stats.inserted++;
            if (samples.length < 5) samples.push(`+ ${link.url}`);
          } else if (r === "update") stats.updated++;
          else if (r === "skip") stats.skipped++;
          else stats.errors++;
        } catch (e) {
          console.log(`[scrape-free] listing error ${link.url}: ${e}`);
          stats.errors++;
        }
      }
    }
  }

  console.log(`[scrape-free] done`, stats);
  return new Response(JSON.stringify({ success: true, stats, samples }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

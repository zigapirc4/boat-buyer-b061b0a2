// Firecrawl-free scraper. Mirrors the rules of `scrape-listings-cron` (same sources,
// same URL validation, same boat-type detection) but uses direct HTTP fetch + r.jina.ai
// fallback instead of Firecrawl, so it costs zero credits and can run frequently.
//
// Sources covered: mornar.net (sail+power), trovobarche.it (sail+power), boat24.com (sail+power).
// Pagination matches the existing CATEGORY_PAGES config.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Sources (same rules as scrape-listings-cron CATEGORY_PAGES) ----------

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
  if (hostname.includes("trovobarche.it")) {
    // Listing detail URLs look like: https://www.trovobarche.it/en/<slug>-classified-<id>
    return /\/en\/[a-z0-9][a-z0-9-]*-classified-\d{4,}(?:[\/?#]|$)/i.test(url);
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

function extractImages(html: string, baseUrl: string, max = 5, site?: string): string[] {
  if (site === "trovobarche.it") {
    const trovobarcheImages = extractTrovobarcheImages(html, baseUrl, max);
    if (trovobarcheImages.length > 0) return trovobarcheImages;
  }

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
  return await fetchHtmlViaProxy(url, timeoutMs);
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

// boat24.com: equipment is in `<div id="equipment">…<ul>…<li>Item</li></ul>`
function extractBoat24(html: string): { description: string | null; equipment: string[] } {
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
  return { description, equipment };
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
    let txt = stripTags(raw)
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
  equipment: string[] | null;
} {
  const text = stripTags(html);

  let title: string | null = extractMeta(html, "og:title");
  if (!title) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (t) title = decodeEntities(t[1]).trim();
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
  const images = extractImages(html, url, 5, site);
  const boat_type = detectBoatType(text, url, hintType);

  // Site-specific RICH extraction for description + equipment
  let description: string | null = null;
  let equipment: string[] = [];
  if (site === "boat24.com") {
    const r = extractBoat24(html);
    description = r.description;
    equipment = r.equipment;
  } else if (site === "trovobarche.it") {
    const r = extractTrovobarche(html);
    description = r.description;
    equipment = r.equipment;
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
  }
  // Fallback to og:description if site-specific extraction failed
  if (!description) {
    description = extractMeta(html, "og:description") || extractMeta(html, "description");
  }
  // Cap description length to avoid bloating the DB
  if (description && description.length > 5000) description = description.slice(0, 5000) + "…";

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
    equipment: equipment.length > 0 ? equipment : null,
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
  let pageStart = 1;
  let pageEnd: number | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.categoryStart === "number") categoryStart = body.categoryStart;
    if (typeof body.categoryEnd === "number") categoryEnd = body.categoryEnd;
    if (typeof body.maxListingsPerPage === "number") maxListingsPerPage = body.maxListingsPerPage;
    if (typeof body.pageStart === "number") pageStart = Math.max(1, Math.floor(body.pageStart));
    if (typeof body.pageEnd === "number") pageEnd = Math.max(1, Math.floor(body.pageEnd));
  } catch {}

  const stats = { categoriesProcessed: 0, listingsFound: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const samples: string[] = [];

  const cats = CATEGORY_PAGES.slice(categoryStart, categoryEnd);
  console.log(`[scrape-free] starting: ${cats.length} categories, maxListingsPerPage=${maxListingsPerPage}`);

  for (const cat of cats) {
    stats.categoriesProcessed++;
    const startPage = Math.min(pageStart, cat.pages);
    const endPage = Math.max(startPage, Math.min(pageEnd ?? cat.pages, cat.pages));
    for (let page = startPage; page <= endPage; page++) {
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
          let parsed = parseListing(html, link.url, cat.site, cat.boatType);

          // Trovobarche can return teaser descriptions on direct fetch for some ads.
          // When we detect a likely teaser, retry description extraction using proxy HTML.
          if (
            cat.site === "trovobarche.it" &&
            parsed.description &&
            /\.\.\./.test(parsed.description)
          ) {
            const proxyHtml = await fetchHtmlViaProxy(link.url, 12000);
            if (proxyHtml) {
              const proxyParsed = parseListing(proxyHtml, link.url, cat.site, cat.boatType);
              if (
                proxyParsed.description &&
                proxyParsed.description.length > parsed.description.length + 40
              ) {
                parsed = { ...parsed, description: proxyParsed.description };
              }
            }
          }

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
            equipment: parsed.equipment,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// ---------- Token-free HTML parsing helpers ----------

const FX_TO_EUR: Record<string, number> = {
  EUR: 1, GBP: 1.17, USD: 0.92, CHF: 1.04, NOK: 0.087, SEK: 0.088, DKK: 0.134,
  HRK: 0.133, AUD: 0.61, CAD: 0.68,
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
  return decodeEntities(s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parsePriceWithCurrency(text: string): { eur: number | null; currency: string | null } {
  if (!text) return { eur: null, currency: null };
  // Match symbol or 3-letter currency followed by number, or number followed by currency
  const patterns: { re: RegExp; cur: string }[] = [
    { re: /€\s*([\d.,\s]{3,})/i, cur: "EUR" },
    { re: /EUR\s*([\d.,\s]{3,})/i, cur: "EUR" },
    { re: /([\d.,\s]{3,})\s*€/i, cur: "EUR" },
    { re: /([\d.,\s]{3,})\s*EUR/i, cur: "EUR" },
    { re: /£\s*([\d.,\s]{3,})/i, cur: "GBP" },
    { re: /GBP\s*([\d.,\s]{3,})/i, cur: "GBP" },
    { re: /\$\s*([\d.,\s]{3,})/i, cur: "USD" },
    { re: /USD\s*([\d.,\s]{3,})/i, cur: "USD" },
    { re: /CHF\s*([\d.,\s]{3,})/i, cur: "CHF" },
  ];
  for (const { re, cur } of patterns) {
    const m = text.match(re);
    if (m) {
      const raw = m[1].replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
      const num = parseFloat(raw.replace(",", "."));
      if (num > 500 && num < 50_000_000) {
        return { eur: Math.round(num * (FX_TO_EUR[cur] ?? 1)), currency: cur };
      }
    }
  }
  return { eur: null, currency: null };
}

function parseLengthFeet(text: string): number | null {
  if (!text) return null;
  // Try meters first (more common in EU listings)
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

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
  const value = Number.parseFloat(normalized.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseYear(text: string): number | null {
  if (!text) return null;
  // Look for year keywords first
  const keyed = text.match(/(?:year|year built|built|baujahr|année|anno|godina|leto)[\s:]+(\d{4})/i);
  if (keyed) {
    const y = parseInt(keyed[1]);
    if (y >= 1950 && y <= new Date().getFullYear() + 1) return y;
  }
  // Plain year, prefer years <= current
  const all = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/g);
  if (all && all.length > 0) {
    return parseInt(all[0]);
  }
  return null;
}

function parseEngineHours(text: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d{1,5})\s*(?:engine\s*hours|hours|h\b|stunden|ore|sati|motorstunden)/i);
  if (m) {
    const h = parseInt(m[1]);
    if (h > 0 && h < 30000) return h;
  }
  return null;
}

function parseEngineHp(text: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d{2,4})\s*(?:hp|ps|cv|ks|cavalli|konjev|kw)/i);
  if (m) {
    const v = parseInt(m[1]);
    if (m[0].toLowerCase().includes("kw")) {
      // convert kW → HP
      return Math.round(v * 1.341);
    }
    if (v >= 5 && v <= 3000) return v;
  }
  return null;
}

function parseEngineMake(text: string): string | null {
  const makes = ["Volvo Penta", "Volvo", "Yanmar", "Mercury", "Mercruiser", "Yamaha", "Suzuki", "Honda", "Tohatsu", "Perkins", "Cummins", "Caterpillar", "MAN", "Nanni", "Bukh", "Lombardini", "Vetus", "Steyr"];
  for (const m of makes) {
    const re = new RegExp(`\\b${m.replace(/\s/g, "\\s*")}\\b`, "i");
    if (re.test(text)) return m;
  }
  return null;
}

function parseBrandModelFromTitle(boatModel: string | null): { brand: string | null; model: string | null } {
  if (!boatModel) return { brand: null, model: null };
  const cleaned = boatModel.replace(/\s+/g, " ").trim();
  if (!cleaned) return { brand: null, model: null };
  const tokens = cleaned.split(" ").filter(Boolean);
  return {
    brand: tokens.length >= 2 ? tokens[0].slice(0, 120) : null,
    model: cleaned.slice(0, 160),
  };
}

function inferBoatTypeFromUrl(url: string): "sailboat" | "powerboat" | null {
  const u = url.toLowerCase();
  if (
    /\/(motornaplovila|motorna-plovila|motorna_plovila|motor-boats?|motorboats?|powerboats?|power-?boats?)\//.test(
      u,
    ) ||
    /[?&]cat=2(?:[&#]|$)/.test(u) ||
    /[?&]rubrika=1(?:[&#]|$)/.test(u) ||
    /\/motor-boats-203(?:[/?#]|$)/.test(u)
  ) {
    return "powerboat";
  }
  if (
    /\/(jadrnice|sailboats?|sailing|vela|barca-a-vela)\//.test(u) ||
    /[?&]cat=1(?:[&#]|$)/.test(u) ||
    /[?&]rubrika=2(?:[&#]|$)/.test(u) ||
    /\/sailboats-202(?:[/?#]|$)/.test(u)
  ) {
    return "sailboat";
  }
  return null;
}

function detectBoatType(text: string, url: string): "sailboat" | "powerboat" | null {
  // Strongest signal: category path/query in the listing URL itself.
  const urlType = inferBoatTypeFromUrl(url);
  if (urlType) return urlType;

  const u = `${url} ${text}`.toLowerCase();
  const sailRe =
    /\b(sailboat|sailing|sailingboat|sail|segelboot|segelyacht|veliero|barca a vela|jedrilica|voilier|velero|purjeve|sejlbåd|jadrnic[ae]|jadrno)\b/;
  const powerRe =
    /\b(powerboat|motorboat|motoryacht|motorboot|barca a motore|gliser|motoryacht|motorbåd|moottorivene|motorn[ao]|motornaplovila|motorna plovila|outboard|inboard|sterndrive|jet drive|planing)\b/;
  const sailGearRe = /\b(mainsail|genoa|spinnaker|jib|mast|rigging)\b/;

  const sailHits = Number(sailRe.test(u)) + Number(sailGearRe.test(u));
  const powerHits = Number(powerRe.test(u));

  if (powerHits > sailHits) return "powerboat";
  if (sailHits > powerHits) return "sailboat";
  return null;
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

function parseHullMaterial(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bfiberglass|grp|gfk|fibreglass|vetroresina\b/.test(t)) return "fiberglass";
  if (/\bsteel|stahl|acciaio|čelik\b/.test(t)) return "steel";
  if (/\baluminum|aluminium|alu\b/.test(t)) return "aluminum";
  if (/\bwood|holz|legno|drvo\b/.test(t)) return "wood";
  if (/\bcomposite|sandwich\b/.test(t)) return "composite";
  return null;
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
    } catch { /* ignore malformed JSON-LD */ }
  }
  return blocks;
}

function extractMeta(html: string, prop: string): string | null {
  // og:title, og:image, og:description, twitter:image, etc.
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  if (m) return decodeEntities(m[1]);
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1]) : null;
}

function extractImages(html: string, baseUrl: string, max = 5): string[] {
  const out = new Set<string>();
  const og = extractMeta(html, "og:image");
  if (og) out.add(resolveUrl(og, baseUrl));
  const tw = extractMeta(html, "twitter:image");
  if (tw) out.add(resolveUrl(tw, baseUrl));
  const re = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+\.(?:jpe?g|png|webp))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = resolveUrl(m[1], baseUrl);
    // Filter junk: tiny logos, icons, sprites
    if (/\b(logo|icon|sprite|placeholder|pixel|tracking|favicon|avatar)\b/i.test(u)) continue;
    out.add(u);
    if (out.size >= max + 5) break;
  }
  return Array.from(out).slice(0, max);
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

function parseListingHtml(html: string, url: string): Record<string, any> {
  const text = stripTags(html);
  const result: Record<string, any> = {};

  // Title from <title> or og:title
  const ogTitle = extractMeta(html, "og:title");
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  result.boat_model = ogTitle || (titleMatch ? decodeEntities(titleMatch[1]).trim() : null);

  // Description from og:description or meta description
  result.description_summary =
    extractMeta(html, "og:description") || extractMeta(html, "description") || null;

  // JSON-LD (best source when present)
  const lds = extractJsonLd(html);
  for (const ld of lds) {
    const types = ([] as string[]).concat(ld["@type"] || []);
    if (types.some((t) => /Product|Vehicle|Boat|Vessel|Offer/i.test(t))) {
      if (ld.name && !result.boat_model) result.boat_model = ld.name;
      if (!result.brand && ld.brand) {
        const brand = typeof ld.brand === "string" ? ld.brand : ld.brand?.name;
        if (brand) result.brand = String(brand).trim();
      }
      if (!result.model && ld.model) result.model = String(ld.model).trim();
      if (ld.description && !result.description_summary) result.description_summary = ld.description;
      const offers = ld.offers || ld.Offer || ld;
      const price = offers?.price || offers?.priceSpecification?.price;
      const cur = offers?.priceCurrency || offers?.priceSpecification?.priceCurrency || "EUR";
      if (price) {
        const num = typeof price === "string" ? parseFloat(price.replace(/[^\d.]/g, "")) : Number(price);
        if (num > 0) {
          result.price_eur = Math.round(num * (FX_TO_EUR[cur] ?? 1));
          result.price_currency = cur;
        }
      }
      if (ld.image) {
        const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
        result.images = imgs.slice(0, 5);
      }
      const addr = ld.address || ld.location?.address || offers?.availableAtOrFrom?.address;
      const ldLocation =
        ld.location?.name || addr?.addressLocality || addr?.addressRegion || addr?.addressCountry || null;
      if (ldLocation && !result.location) result.location = normalizeLocationValue(String(ldLocation).trim());
    }
  }

  // Fallbacks via regex over visible text
  if (!result.price_eur) {
    const p = parsePriceWithCurrency(text);
    if (p.eur) {
      result.price_eur = p.eur;
      result.price_currency = p.currency;
    }
  }
  if (!result.images || result.images.length === 0) {
    result.images = extractImages(html, url);
  }

  result.year = parseYear(text);
  result.length_feet = parseLengthFeet(text);
  result.engine_hours = parseEngineHours(text);
  result.engine_hp = parseEngineHp(text);
  result.engine_make = parseEngineMake(text);
  result.hull_material = parseHullMaterial(text);
  result.boat_type = detectBoatType(text, url);
  const fallbackBrandModel = parseBrandModelFromTitle(result.boat_model || null);
  if (!result.brand) result.brand = fallbackBrandModel.brand;
  if (!result.model) result.model = fallbackBrandModel.model;

  // Location: try og:locality or visible text near "Location"
  const locMatch = text.match(/(?:location|standort|posizione|lokacija|localización)[\s:]+([^.\n,|]{3,80})/i);
  if (locMatch) result.location = normalizeLocationValue(locMatch[1]);
  // Boat24-specific fallback: location card often renders "Location" label with country beneath.
  if (!result.location && /boat24\.com/i.test(url)) {
    const idx = html.search(/>\s*Location\s*</i);
    if (idx >= 0) {
      const chunk = html.slice(Math.max(0, idx - 200), idx + 2200);
      const plain = stripTags(chunk).replace(/\bLocation\b/i, " ").replace(/\s{2,}/g, " ").trim();
      const m = plain.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
      if (m && !/(Contact|Favorite|Share|Views|Save|PDF)/i.test(m[1])) {
        result.location = normalizeLocationValue(m[1]);
      }
    }
  }
  // Boat24 JSON fallback: many pages embed country/location in script blobs.
  if (!result.location && /boat24\.com/i.test(url)) {
    const re =
      /"(?:addressCountry|countryName|country|locationName|location|regionName|region)"\s*:\s*"([A-Z][A-Za-z\s-]{2,40})"/gi;
    let jm: RegExpExecArray | null;
    while ((jm = re.exec(html)) !== null) {
      const v = (jm[1] || "").trim();
      if (!v) continue;
      if (/(Contact|Favorite|Share|Views|Save|PDF|Boat24|usedboats)/i.test(v)) continue;
      result.location = normalizeLocationValue(v);
      break;
    }
  }
  // Trovobarche fallback: parse city from seller address like "00137 Roma(RM)".
  if (!result.location && /trovobarche\.it/i.test(url)) {
    const zipCity = html.match(/\b\d{4,6}\s+([A-Z][A-Za-z'’\- ]{2,40})\s*\([A-Z]{2}\)/);
    if (zipCity?.[1]) result.location = normalizeLocationValue(zipCity[1]);
  }

  return result;
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

  // EUR-like values -> number
  const eurPatterns = [
    /€\s*([\d.,\s]{3,})/i,
    /EUR\s*([\d.,\s]{3,})/i,
    /([\d.,\s]{3,})\s*€/i,
    /([\d.,\s]{3,})\s*EUR/i,
  ];
  for (const re of eurPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const num = parseNumber(m[1]);
    if (num && num > 0) return Math.round(num);
  }

  // ft -> m
  const ftMatch = text.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(ft|feet|foot)\b/i);
  if (ftMatch) {
    const ft = parseNumber(ftMatch[1]);
    if (ft && ft > 1) return Math.round((ft * 0.3048) * 100) / 100;
  }

  // meter value as number
  const meterMatch = text.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*(m|meter|metre|meters|metres)\b/i);
  if (meterMatch) {
    const m = parseNumber(meterMatch[1]);
    if (m && m > 0) return Math.round(m * 100) / 100;
  }

  // generic numeric cleanup with optional unit suffix
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

function extractDynamicSpecs(html: string, parsed: Record<string, any>): Record<string, unknown> {
  const specs: Record<string, unknown> = {};

  // Pull tabular/list specs from HTML blocks.
  const addPair = (kRaw: string, vRaw: string) => {
    const key = stripTags(kRaw).replace(/[:\s]+$/, "").trim();
    const value = stripTags(vRaw).trim();
    if (!key || !value) return;
    mergeSpec(specs, key, value);
  };

  const rowRe = /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) addPair(m[1], m[2]);

  const liBadgeRe = /<li[^>]*>([^<]+?)<span[^>]*class=["'][^"']*(?:badge|value)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
  while ((m = liBadgeRe.exec(html)) !== null) addPair(m[1], m[2]);

  const labelValueRe =
    /<(?:span|div)[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>[\s\S]{0,300}?<(?:span|div)[^>]*class=["'][^"']*\bvalue\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/gi;
  while ((m = labelValueRe.exec(html)) !== null) addPair(m[1], m[2]);

  // Pull JSON-LD additional properties.
  const lds = extractJsonLd(html);
  for (const block of lds) {
    const arr = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
    for (const ld of arr) {
      const additional = Array.isArray(ld?.additionalProperty) ? ld.additionalProperty : [];
      for (const p of additional) {
        mergeSpec(specs, p?.name || p?.propertyID || "additional_property", p?.value);
      }
    }
  }

  // Include parsed useful fields in specs as dynamic enrichment.
  for (const [k, v] of Object.entries(parsed)) {
    if (
      ["boat_model", "price_eur", "year", "length_feet", "location", "description_summary", "images"].includes(k)
    ) {
      continue;
    }
    mergeSpec(specs, k, v);
  }

  return specs;
}

function buildFlexibleListingOutput(html: string, parsed: Record<string, any>): {
  core: { title: string; price_eur: number | null; year: number | null; length_m: number | null; location: string | null };
  specs: Record<string, unknown>;
  raw: { description: string; full_text: string };
} {
  const fullText = stripTags(html);
  const lengthM =
    typeof parsed.length_feet === "number" && Number.isFinite(parsed.length_feet)
      ? Math.round((parsed.length_feet * 0.3048) * 100) / 100
      : null;

  return {
    core: {
      title: String(parsed.boat_model || "").trim() || "Unknown listing",
      price_eur: typeof parsed.price_eur === "number" && Number.isFinite(parsed.price_eur) ? parsed.price_eur : null,
      year: typeof parsed.year === "number" && Number.isFinite(parsed.year) ? parsed.year : null,
      length_m: lengthM,
      location: typeof parsed.location === "string" && parsed.location.trim() ? parsed.location.trim() : null,
    },
    specs: extractDynamicSpecs(html, parsed),
    raw: {
      description: String(parsed.description_summary || "").trim(),
      full_text: fullText,
    },
  };
}

async function fetchBoat24LocationViaMarkdownProxy(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5)" },
    });
    if (!res.ok) return null;
    const body = await res.text();
    if (!body) return null;
    const clean = (v: string) =>
      v
        .replace(/\*\*/g, "")
        .replace(/\s*»\s*/g, " » ")
        .replace(/\s{2,}/g, " ")
        .trim();
    const section = body.match(/##\s*Location\s*\n+([^\n]{3,100})\n/i);
    if (section?.[1]) return clean(section[1]);
    const inline = body.match(/\bLocation\b[\s:|-]+([A-Za-z][A-Za-z\s\-»*]{2,100})/i);
    if (inline?.[1]) return clean(inline[1]);
  } catch {
    /* ignore */
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
    console.log("Playwright fetch failed:", e);
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

async function invokeScrapeFreeForUrl(
  supabaseUrl: string,
  fallbackApiKey: string,
  url: string,
  authHeader: string | null,
  apiKeyHeader: string | null,
): Promise<{ success: boolean; data?: any; error?: string; source?: string }> {
  try {
    const authorization = authHeader && authHeader.trim().length > 0 ? authHeader : null;
    const apiKey = apiKeyHeader && apiKeyHeader.trim().length > 0 ? apiKeyHeader : fallbackApiKey;
    const resp = await fetch(`${supabaseUrl}/functions/v1/scrape-free`, {
      method: "POST",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [url] }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { success: false, error: `scrape-free HTTP ${resp.status}: ${body.slice(0, 300)}` };
    }
    const payload = await resp.json().catch(() => null);
    if (!payload?.success) {
      return { success: false, error: payload?.error || "scrape-free returned unsuccessful response" };
    }
    const data = payload?.data || payload?.results?.[0]?.data || null;
    if (!data?.core || !data?.specs || !data?.raw) {
      return { success: false, error: "scrape-free returned invalid data shape" };
    }
    return { success: true, data, source: "scrape-free" };
  } catch (e) {
    return { success: false, error: `scrape-free invoke failed: ${e}` };
  }
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Checking cache for URL:", formattedUrl);

    // ZERO-COST PATH 1: check if we already have this listing in cached_listings
    const cacheRes = await fetch(
      `${supabaseUrl}/rest/v1/cached_listings?url=eq.${encodeURIComponent(formattedUrl)}&select=*&limit=1`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    );

    if (cacheRes.ok) {
      const cacheRows = await cacheRes.json();
      if (Array.isArray(cacheRows) && cacheRows.length > 0) {
        const row = cacheRows[0];
        const aiDetails =
          row.specs_raw && typeof row.specs_raw === "object"
            ? (row.specs_raw as Record<string, unknown>).ai_details ?? null
            : null;
        const hasSegment = Boolean(row.segment);
        if (row.price_eur && row.length_feet && row.year && aiDetails && hasSegment) {
          console.log("Cache hit — returning DB row");
          const cachedFlexible = {
            core: {
              title: String(row.title || "Unknown listing"),
              price_eur: row.price_eur ? Number(row.price_eur) : null,
              year: row.year ? Number(row.year) : null,
              length_m: row.length_feet ? Math.round(Number(row.length_feet) * 0.3048 * 100) / 100 : null,
              location: row.location || null,
            },
            specs: {
              brand: row.brand ?? null,
              model: row.model ?? null,
              type: row.boat_type ?? null,
              segment: row.segment ?? null,
              boat_type: row.boat_type ?? null,
              engine_hours: row.engine_hours ?? null,
              fuel_type: row.fuel_type ?? null,
              cabins: row.cabins ?? null,
              hull_material: row.hull_material ?? null,
              engine_info: row.engine_info ?? null,
              image_urls: row.image_urls || (row.image_url ? [row.image_url] : []),
              ai_details: aiDetails,
            },
            raw: {
              description: row.description || "",
              full_text: row.description || "",
            },
          };
          return new Response(
            JSON.stringify({ success: true, data: cachedFlexible, source: "cache" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }
    console.log("Cache miss/incomplete AI — delegating to scrape-free:", formattedUrl);
    const delegated = await invokeScrapeFreeForUrl(
      supabaseUrl,
      supabaseKey,
      formattedUrl,
      req.headers.get("authorization"),
      req.headers.get("apikey"),
    );
    if (!delegated.success || !delegated.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: delegated.error || "Could not process listing through scrape-free.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: delegated.data,
        source: delegated.source || "scrape-free",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

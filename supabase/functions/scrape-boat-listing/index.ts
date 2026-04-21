import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function detectBoatType(text: string, url: string): "sailboat" | "powerboat" | null {
  const u = (url + " " + text).toLowerCase();
  if (/\b(sailboat|sailing|sailingboat|segelboot|segelyacht|veliero|barca a vela|jedrilica|voilier|velero|purjeve|sejlbåd)\b/.test(u)) return "sailboat";
  if (/\b(powerboat|motorboat|motoryacht|motorboot|barca a motore|gliser|motoryacht|motorbåd|moottorivene)\b/.test(u)) return "powerboat";
  if (/\b(mainsail|genoa|spinnaker|jib|mast|rigging)\b/.test(u)) return "sailboat";
  if (/\b(outboard|sterndrive|jet drive|planing)\b/.test(u)) return "powerboat";
  return null;
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

  // Defaults so the form is usable
  result.engine_condition = result.engine_hours
    ? result.engine_hours > 5000 ? "bad" : result.engine_hours > 3000 ? "average" : "good"
    : "good";
  result.hull_condition = "good";
  result.sails_condition = result.boat_type === "powerboat" ? "none" : "average";

  // Location: try og:locality or visible text near "Location"
  const locMatch = text.match(/(?:location|standort|posizione|lokacija|localización)[\s:]+([^.\n,|]{3,80})/i);
  if (locMatch) result.location = locMatch[1].trim();

  return result;
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
        if (row.price_eur && row.length_feet && row.year) {
          console.log("Cache hit — returning DB row");
          const cachedExtract = {
            boat_model: row.title,
            boat_type: row.boat_type || "sailboat",
            year: row.year,
            price_eur: Number(row.price_eur),
            length_feet: Number(row.length_feet),
            location: row.location,
            images: row.image_urls || (row.image_url ? [row.image_url] : []),
            engine_make: row.engine_info ? String(row.engine_info).split(" ")[0] : undefined,
            engine_model: row.engine_info,
            engine_hours: row.engine_hours,
            engine_type: row.fuel_type,
            engine_condition: row.engine_hours && row.engine_hours > 3000 ? "average" : "good",
            hull_material: row.hull_material,
            hull_condition: "good",
            sails_condition: row.boat_type === "powerboat" ? "none" : "average",
            cabins: row.cabins,
            description_summary: row.description,
          };
          return new Response(
            JSON.stringify({ success: true, data: cachedExtract, source: "cache" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ZERO-COST PATH 2: direct HTML fetch + regex/JSON-LD parsing (no Firecrawl, no AI)
    console.log("Cache miss — fetching HTML directly:", formattedUrl);

    let html = "";
    try {
      const htmlRes = await fetch(formattedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,it;q=0.8,de;q=0.7,hr;q=0.6",
        },
        redirect: "follow",
      });
      if (!htmlRes.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Listing site returned ${htmlRes.status}. Some sites block direct scrapers — please fill the form manually.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      html = await htmlRes.text();
    } catch (e) {
      console.error("Direct fetch failed:", e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not load the listing page. Please fill the form manually.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = parseListingHtml(html, formattedUrl);
    console.log("Parsed data:", JSON.stringify({
      model: extracted.boat_model, year: extracted.year, price: extracted.price_eur,
      len: extracted.length_feet, images: extracted.images?.length,
    }));

    // Persist back to cached_listings so future loads are instant
    try {
      const updates: Record<string, any> = {};
      if (extracted.price_eur) updates.price_eur = extracted.price_eur;
      if (extracted.year) updates.year = extracted.year;
      if (extracted.length_feet) updates.length_feet = extracted.length_feet;
      if (extracted.boat_type) updates.boat_type = extracted.boat_type;
      if (extracted.hull_material) updates.hull_material = extracted.hull_material;
      if (extracted.engine_hours) updates.engine_hours = extracted.engine_hours;
      if (extracted.location) updates.location = extracted.location;
      if (extracted.description_summary) updates.description = extracted.description_summary;
      if (extracted.images?.length) {
        updates.image_urls = extracted.images;
        updates.image_url = extracted.images[0];
      }
      if (extracted.engine_make) {
        const engineParts = [extracted.engine_make, extracted.engine_hp ? `${extracted.engine_hp}hp` : null].filter(Boolean);
        updates.engine_info = engineParts.join(" ");
      }

      if (Object.keys(updates).length > 0) {
        // Try update first; if no row matches, insert
        const patchResp = await fetch(
          `${supabaseUrl}/rest/v1/cached_listings?url=eq.${encodeURIComponent(formattedUrl)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(updates),
          }
        );
        const patched = patchResp.ok ? await patchResp.json() : [];
        if (Array.isArray(patched) && patched.length === 0) {
          // Row didn't exist — insert
          let source = "";
          try { source = new URL(formattedUrl).hostname.replace("www.", ""); } catch {}
          await fetch(`${supabaseUrl}/rest/v1/cached_listings`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              url: formattedUrl,
              title: extracted.boat_model || formattedUrl,
              source,
              ...updates,
            }),
          });
          console.log("Inserted new cached_listing for:", formattedUrl);
        } else {
          console.log("Updated cached_listing for:", formattedUrl);
        }
      }
    } catch (e) {
      console.error("Error persisting parsed data:", e);
    }

    return new Response(
      JSON.stringify({ success: true, data: extracted, source: "html-parse" }),
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

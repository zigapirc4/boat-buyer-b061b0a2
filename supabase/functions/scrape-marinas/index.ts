const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MarinaInput = {
  name: string;
  country: string;
  region?: string | null;
  website: string;
  notes?: string | null;
  raw_text?: string;
};

const FX_TO_EUR: Record<string, number> = {
  EUR: 1,
  DKK: 0.134,
  HRK: 0.133,
  GBP: 1.17,
  USD: 0.92,
  CHF: 1.04,
  NOK: 0.087,
  SEK: 0.088,
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

function parseNumber(raw: string): number | null {
  const n = raw.replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
  const v = Number.parseFloat(n.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function normalizeCurrency(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("€") || t.includes("eur")) return "EUR";
  if (t.includes("dkk")) return "DKK";
  if (t.includes("hrk") || t.includes("kn")) return "HRK";
  if (t.includes("£") || t.includes("gbp")) return "GBP";
  if (t.includes("$") || t.includes("usd")) return "USD";
  if (t.includes("chf")) return "CHF";
  if (t.includes("nok")) return "NOK";
  if (t.includes("sek")) return "SEK";
  return "EUR";
}

function toEur(amount: number, currency: string): number {
  return amount * (FX_TO_EUR[currency] ?? 1);
}

function extractPricePerMeterYear(text: string): { priceEur: number; currency: string; confidence: number; note: string } | null {
  if (!text) return null;

  // Strong signal: explicit €/m/year-like expression.
  const strongPatterns: RegExp[] = [
    /(?:€|eur|dkk|hrk|gbp|usd|chf|nok|sek)\s*([\d.,\s]{2,12})\s*(?:\/|per)?\s*(?:m|meter|metre)\s*(?:\/|per)?\s*(?:year|yr|annum|annual|godina|anno)/i,
    /([\d.,\s]{2,12})\s*(?:€|eur|dkk|hrk|gbp|usd|chf|nok|sek)\s*(?:\/|per)?\s*(?:m|meter|metre)\s*(?:\/|per)?\s*(?:year|yr|annum|annual|godina|anno)/i,
  ];
  for (const re of strongPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const amount = parseNumber(m[1]);
    if (!amount || amount < 5 || amount > 2000) continue;
    const currency = normalizeCurrency(m[0]);
    return {
      priceEur: Math.round(toEur(amount, currency)),
      currency,
      confidence: 0.95,
      note: `Parsed explicit per-meter yearly tariff: ${m[0]}`,
    };
  }

  // Medium signal: annual total for known boat length, derive per meter.
  const derivedPatterns: RegExp[] = [
    /(?:for|za|per)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:m|meter|metre)[^\n]{0,60}?(?:€|eur|dkk|hrk|gbp|usd|chf|nok|sek)\s*([\d.,\s]{3,14})[^\n]{0,40}?(?:year|yr|annual|annum|godina|anno)/i,
    /(?:€|eur|dkk|hrk|gbp|usd|chf|nok|sek)\s*([\d.,\s]{3,14})[^\n]{0,40}?(?:year|yr|annual|annum|godina|anno)[^\n]{0,60}?(?:for|za|per)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:m|meter|metre)/i,
  ];
  for (const re of derivedPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const a = parseNumber(m[1]);
    const b = parseNumber(m[2]);
    if (!a || !b) continue;
    const possibleLength = a < 40 ? a : b;
    const possibleAnnual = a >= 40 ? a : b;
    if (possibleLength < 4 || possibleLength > 30) continue;
    if (possibleAnnual < 300 || possibleAnnual > 100000) continue;
    const currency = normalizeCurrency(m[0]);
    const eurAnnual = toEur(possibleAnnual, currency);
    const perMeter = eurAnnual / possibleLength;
    if (perMeter < 5 || perMeter > 2000) continue;
    return {
      priceEur: Math.round(perMeter),
      currency,
      confidence: 0.78,
      note: `Derived from annual tariff and vessel length: ${m[0]}`,
    };
  }

  return null;
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: ctrl.signal });
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 500) return html;
    }
  } catch {
    /* ignore */
  } finally {
    clearTimeout(t);
  }
  try {
    const proxy = await fetch(`https://r.jina.ai/${url}`, { headers: { "User-Agent": headers["User-Agent"] } });
    if (!proxy.ok) return null;
    const body = await proxy.text();
    return body && body.length > 100 ? body : null;
  } catch {
    return null;
  }
}

async function upsertMarina(supabaseUrl: string, supabaseKey: string, payload: Record<string, unknown>) {
  const website = String(payload.website || "");
  const patch = await fetch(`${supabaseUrl}/rest/v1/marinas?website=eq.${encodeURIComponent(website)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!patch.ok) return false;
  const patched = await patch.json();
  if (Array.isArray(patched) && patched.length > 0) return true;
  const ins = await fetch(`${supabaseUrl}/rest/v1/marinas`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  return ins.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let entries: MarinaInput[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.entries)) entries = body.entries;
  } catch {
    /* ignore */
  }

  // Default behavior: rescrape existing marinas with website set.
  if (entries.length === 0) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/marinas?select=name,country,region,website,notes&not=website.is.null&limit=500`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } },
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) entries = rows;
    }
  }

  const stats = { total: entries.length, updated: 0, failed: 0, skipped: 0 };
  const sample: Array<{ name: string; price_per_meter_year: number; confidence: number }> = [];

  for (const e of entries) {
    try {
      if (!e?.website || !e?.name || !e?.country) {
        stats.skipped++;
        continue;
      }
      const raw = e.raw_text || (await fetchHtml(e.website, 15000)) || "";
      if (!raw) {
        stats.failed++;
        continue;
      }
      const text = stripTags(raw);
      const extracted = extractPricePerMeterYear(text);
      if (!extracted) {
        stats.failed++;
        continue;
      }

      const ok = await upsertMarina(supabaseUrl, supabaseKey, {
        name: e.name,
        country: e.country,
        region: e.region || null,
        website: e.website,
        notes: e.notes || extracted.note,
        source: "scrape-marinas-v2",
        price_per_meter_year: extracted.priceEur,
        currency: "EUR",
        confidence_score: extracted.confidence,
        last_updated: new Date().toISOString(),
        scraped_at: new Date().toISOString(),
      });
      if (ok) {
        stats.updated++;
        if (sample.length < 10) {
          sample.push({
            name: e.name,
            price_per_meter_year: extracted.priceEur,
            confidence: extracted.confidence,
          });
        }
      } else {
        stats.failed++;
      }
    } catch {
      stats.failed++;
    }
  }

  return new Response(JSON.stringify({ success: true, stats, sample }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeTokens(input: string): string[] {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t: string) => t.length >= 3 && !["used", "new", "boat", "yacht", "year", "del"].includes(t));
}

// Pure DB-based similar boat search — zero scraping, zero token cost.
// Queries the cached_listings table that's already populated by the cron scraper.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, length_feet, year, boat_type } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetLen = Number(length_feet) || null;
    const targetYear = Number(year) || null;
    const type = boat_type === "powerboat" ? "powerboat" : "sailboat";

    // Pull a generous candidate pool, then rank in JS for flexibility
    let query = supabase
      .from("cached_listings")
      .select("title, url, description, price_eur, year, length_feet, location, image_url, engine_info, boat_type, scraped_at")
      .eq("boat_type", type)
      .not("price_eur", "is", null)
      .gt("price_eur", 0)
      .limit(300);

    if (targetLen) {
      query = query.gte("length_feet", targetLen - 6).lte("length_feet", targetLen + 6);
    }
    if (targetYear) {
      query = query.gte("year", targetYear - 8).lte("year", targetYear + 8);
    }

    const { data, error } = await query;
    if (error) {
      console.error("DB query error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidates = data || [];
    console.log(`Found ${candidates.length} candidates for ${type} ~${targetLen}ft ~${targetYear}`);

    // Rank by similarity: model match > length closeness > year closeness
    const modelTokens = normalizeTokens(model || "");
    const modelPhrase = (model || "").toLowerCase().trim();
    const now = Date.now();

    const scored = candidates.map((c) => {
      let score = 0;
      const title = (c.title || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();

      if (modelPhrase && title.includes(modelPhrase)) score += 20;

      // Model token matches (strong signal)
      for (const tok of modelTokens) {
        if (title.includes(tok)) score += 10;
        else if (desc.includes(tok)) score += 3;
      }

      // Length proximity
      if (targetLen && c.length_feet) {
        const diff = Math.abs(Number(c.length_feet) - targetLen);
        score += Math.max(0, 12 - diff * 1.5); // stronger size signal
      }

      // Year proximity
      if (targetYear && c.year) {
        const diff = Math.abs(Number(c.year) - targetYear);
        score += Math.max(0, 8 - diff);
      }

      // Has image bonus
      if (c.image_url) score += 2;

      // Recent listings are more relevant market comps.
      if (c.scraped_at) {
        const ageDays = Math.max(0, Math.floor((now - new Date(c.scraped_at).getTime()) / (1000 * 60 * 60 * 24)));
        score += Math.max(0, 4 - ageDays / 30);
      }

      return { ...c, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    const results = scored.slice(0, 6).map((c) => ({
      title: c.title,
      url: c.url,
      description: c.description || "",
      price_eur: c.price_eur ? Number(c.price_eur) : null,
      year: c.year || null,
      length_feet: c.length_feet ? Number(c.length_feet) : null,
      location: c.location || null,
      image_url: c.image_url || null,
      engine_info: c.engine_info || null,
    }));

    console.log(`Returning ${results.length} similar boats from cache (no Firecrawl used)`);

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

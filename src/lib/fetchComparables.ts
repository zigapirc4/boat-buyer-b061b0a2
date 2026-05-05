import { supabase } from "@/integrations/supabase/client";

function normalizeTokens(model: string): string[] {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["used", "new", "boat", "yacht", "year"].includes(t));
}

export async function fetchComparables(boatType: string, year: number, lengthFt: number, model: string) {
  const { data } = await supabase
    .from("cached_listings")
    .select("price_eur, length_feet, title, year, scraped_at, url, image_url, location, engine_info, description, boat_type, segment, specs_raw")
    .eq("boat_type", boatType)
    .not("boat_type", "is", null)
    .gte("year", year - 2)
    .lte("year", year + 2)
    .gte("length_feet", lengthFt - 4)
    .lte("length_feet", lengthFt + 4)
    .not("price_eur", "is", null)
    .not("length_feet", "is", null)
    .gt("price_eur", 0)
    .gt("length_feet", 0)
    .limit(220);

  const tokens = normalizeTokens(model);
  const now = Date.now();
  const scored = (data || []).map((d) => {
    const title = (d.title || "").toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (title.includes(tok)) score += 10;
    }
    if (d.length_feet) score += Math.max(0, 6 - Math.abs(Number(d.length_feet) - lengthFt));
    if (d.year) score += Math.max(0, 5 - Math.abs(Number(d.year) - year));
    if (d.scraped_at) {
      const ageDays = Math.max(0, Math.floor((now - new Date(d.scraped_at).getTime()) / (1000 * 60 * 60 * 24)));
      score += Math.max(0, 3 - ageDays / 30);
    }
    return {
      price_eur: Number(d.price_eur),
      length_feet: Number(d.length_feet),
      year: d.year ? Number(d.year) : null,
      title: d.title || "Comparable boat",
      url: d.url || "",
      image_url: d.image_url || null,
      location: d.location || null,
      engine_info: d.engine_info || null,
      description: d.description || "",
      boat_type: d.boat_type || null,
      segment: (d as any).segment || null,
      condition_score:
        typeof (d as any)?.specs_raw?.ai_details?.score === "number"
          ? Number((d as any).specs_raw.ai_details.score)
          : null,
      _score: score,
    };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 90).map(({ _score, ...row }) => row);
}

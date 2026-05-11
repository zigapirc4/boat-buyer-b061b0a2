import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildMarketIndex,
  listingDealPayloadsForListingIds,
  pickTopDealCards,
  type CachedListingRow,
  type ListingDealPayload,
} from "../_shared/dealInsight.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOP_DEALS_DEFAULT_CANDIDATES = 3500;
const ROW_SELECT =
  "id,title,url,boat_type,segment,price_eur,year,length_feet,location,image_url,image_urls,engine_info,description,hull_material,engine_hours,source,scraped_at";

const SEGMENT_FETCH_PAGE = 1000;
const SEGMENT_FETCH_CAP = 50_000;

function missingListingPayload(): ListingDealPayload {
  return {
    insight: {
      fairPrice: null,
      gapPct: null,
      confidence: "low",
      label: "No market data",
      shortReason: "Listing not found",
    },
    evalResult: null,
    comparables: [],
  };
}

function extractSegmentFromSpecsRaw(specs_raw: unknown): string | null {
  if (!specs_raw || typeof specs_raw !== "object") return null;
  const o = specs_raw as Record<string, unknown>;
  const top = o.segment;
  if (typeof top === "string" && top.trim()) return top.trim();
  const ai = o.ai_details;
  if (ai && typeof ai === "object") {
    const s = (ai as Record<string, unknown>).segment;
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return null;
}

/** Fill `segment` from specs_raw when the column is empty (common for older rows). */
function applySegmentFallbackFromSpecs(listings: CachedListingRow[]): void {
  for (const L of listings) {
    if (L.segment && String(L.segment).trim()) continue;
    const fromSpecs = extractSegmentFromSpecsRaw(L.specs_raw);
    if (fromSpecs) L.segment = fromSpecs;
  }
}

function stripSpecsRaw(listings: CachedListingRow[]): void {
  for (const L of listings) {
    delete (L as { specs_raw?: unknown }).specs_raw;
  }
}

/** Loads full (boat_type, segment) cohort pages with stable ordering (strict peers only in scoring). */
async function loadCohortForTargets(
  supabase: ReturnType<typeof createClient>,
  targets: CachedListingRow[],
): Promise<CachedListingRow[]> {
  const pairKeys = new Map<string, { boat_type: string; segment: string }>();
  for (const t of targets) {
    if (t.boat_type && t.segment && String(t.segment).trim()) {
      pairKeys.set(`${t.boat_type}:${String(t.segment)}`, {
        boat_type: t.boat_type,
        segment: String(t.segment),
      });
    }
  }

  const byId = new Map<string, CachedListingRow>();
  for (const t of targets) {
    byId.set(t.id, t);
  }

  const fetchPaged = async (run: (offset: number) => Promise<{ data: unknown; error: { message: string } | null }>) => {
    let offset = 0;
    while (offset < SEGMENT_FETCH_CAP) {
      const { data, error } = await run(offset);
      if (error) throw new Error(error.message);
      const chunk = (data || []) as CachedListingRow[];
      for (const r of chunk) byId.set(r.id, r);
      if (chunk.length < SEGMENT_FETCH_PAGE) break;
      offset += SEGMENT_FETCH_PAGE;
    }
  };

  for (const { boat_type, segment } of pairKeys.values()) {
    await fetchPaged((offset) =>
      supabase
        .from("cached_listings")
        .select(ROW_SELECT)
        .eq("boat_type", boat_type)
        .eq("segment", segment)
        .not("price_eur", "is", null)
        .not("length_feet", "is", null)
        .not("year", "is", null)
        .not("segment", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + SEGMENT_FETCH_PAGE - 1));
  }

  return [...byId.values()];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const topDeals = Boolean(body.top_deals);

    if (topDeals) {
      const candidateLimit = Math.min(
        Math.max(100, Number(body.candidate_limit) || TOP_DEALS_DEFAULT_CANDIDATES),
        8000,
      );

      const { data: candidates, error: candErr } = await supabase
        .from("cached_listings")
        .select(ROW_SELECT)
        .not("price_eur", "is", null)
        .not("length_feet", "is", null)
        .not("year", "is", null)
        .not("segment", "is", null)
        .not("image_url", "is", null)
        .neq("image_url", "none")
        .order("scraped_at", { ascending: false })
        .limit(candidateLimit);

      if (candErr) {
        return new Response(JSON.stringify({ success: false, error: candErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rows = (candidates || []) as CachedListingRow[];
      const enrichedRows = await loadCohortForTargets(supabase, rows);
      const enrichedIndex = buildMarketIndex(enrichedRows);

      const top_deals = pickTopDealCards(rows, enrichedIndex, 3);

      return new Response(JSON.stringify({ success: true, top_deals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const listing_ids: string[] = Array.isArray(body.listing_ids) ? body.listing_ids : [];
    const uniqueIds = [...new Set(listing_ids.map((id) => String(id)))].filter(Boolean);
    if (uniqueIds.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "listing_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (uniqueIds.length > 400) {
      return new Response(JSON.stringify({ success: false, error: "Too many listing_ids (max 400)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targets, error: tErr } = await supabase
      .from("cached_listings")
      .select(`${ROW_SELECT},specs_raw`)
      .in("id", uniqueIds);

    if (tErr) {
      return new Response(JSON.stringify({ success: false, error: tErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const listings = (targets || []) as CachedListingRow[];
    applySegmentFallbackFromSpecs(listings);
    const cohortRows = await loadCohortForTargets(supabase, listings);
    stripSpecsRaw(listings);
    const index = buildMarketIndex(cohortRows);
    const payloads = listingDealPayloadsForListingIds(listings, index);

    const full: Record<string, ListingDealPayload> = { ...payloads };
    for (const id of uniqueIds) {
      if (!full[id]) {
        full[id] = missingListingPayload();
      }
    }

    return new Response(JSON.stringify({ success: true, insights: full }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("listing-deal-insights:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

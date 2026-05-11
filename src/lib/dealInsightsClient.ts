import { supabase } from "@/integrations/supabase/client";
import type { EvalResult } from "@/lib/evaluateBoat";

export interface DealInsight {
  fairPrice: number | null;
  gapPct: number | null;
  confidence: "low" | "medium" | "high";
  label: "Great deal" | "Fair" | "Overpriced" | "No market data";
  shortReason: string;
}

export interface DealComparableSnapshot {
  title: string;
  url: string;
  price_eur: number;
  length_feet: number;
  year: number | null;
  location: string | null;
  image_url: string | null;
  engine_info: string | null;
  description: string | null;
  boat_type: string | null;
}

/** Full server-side bundle: badge + rule-based evaluation + comparables (same source as the grid). */
export interface ListingDealPayload {
  insight: DealInsight;
  evalResult: EvalResult | null;
  comparables: DealComparableSnapshot[];
}

const CHUNK_SIZE = 120;

/** Older deployed functions returned a bare `DealInsight` per id; new shape is full `ListingDealPayload`. */
function coerceListingDealPayload(raw: unknown): ListingDealPayload {
  if (!raw || typeof raw !== "object") {
    return placeholderListingDeal();
  }
  const o = raw as Record<string, unknown>;
  const insightObj = o.insight;
  if (insightObj && typeof insightObj === "object" && "label" in insightObj) {
    return {
      insight: insightObj as DealInsight,
      evalResult: (o.evalResult as EvalResult | null | undefined) ?? null,
      comparables: Array.isArray(o.comparables) ? (o.comparables as DealComparableSnapshot[]) : [],
    };
  }
  if ("label" in o && "shortReason" in o) {
    return {
      insight: raw as DealInsight,
      evalResult: null,
      comparables: [],
    };
  }
  return placeholderListingDeal();
}

/** Batch invoke Edge Function `listing-deal-insights` (max 400 ids per request). */
export async function fetchDealInsightsForIds(listing_ids: string[]): Promise<Record<string, ListingDealPayload>> {
  const ids = [...new Set(listing_ids)].filter(Boolean);
  const out: Record<string, ListingDealPayload> = {};
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const slice = ids.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.functions.invoke("listing-deal-insights", {
      body: { listing_ids: slice },
    });
    if (error) throw new Error(error.message);
    const payload = data as {
      success?: boolean;
      insights?: Record<string, unknown>;
      error?: string;
    };
    if (!payload?.success) throw new Error(payload?.error || "Failed to load deal insights");
    for (const [id, row] of Object.entries(payload.insights ?? {})) {
      out[id] = coerceListingDealPayload(row);
    }
  }
  return out;
}

export async function fetchTopDealsFromServer(): Promise<
  { listing: Record<string, unknown>; payload: ListingDealPayload }[]
> {
  const { data, error } = await supabase.functions.invoke("listing-deal-insights", {
    body: { top_deals: true },
  });
  if (error) throw new Error(error.message);
  const payload = data as {
    success?: boolean;
    top_deals?: Array<Record<string, unknown>>;
    error?: string;
  };
  if (!payload?.success) throw new Error(payload?.error || "Failed to load top deals");
  const raw = payload.top_deals ?? [];
  return raw.map((row) => {
    const listing = row.listing as Record<string, unknown>;
    const dealPayload = coerceListingDealPayload(
      row.payload ?? (row.insight ? { insight: row.insight, evalResult: null, comparables: [] } : row),
    );
    return { listing, payload: dealPayload };
  });
}

export function placeholderInsightLoading(): DealInsight {
  return {
    fairPrice: null,
    gapPct: null,
    confidence: "low",
    label: "No market data",
    shortReason: "Scoring…",
  };
}

export function placeholderListingDeal(): ListingDealPayload {
  return {
    insight: placeholderInsightLoading(),
    evalResult: null,
    comparables: [],
  };
}

import { evaluate, type BoatSegment, type BoatType, type EvalResult } from "./evaluateBoat.ts";

/** Row shape from cached_listings (subset of columns). */
export interface CachedListingRow {
  id: string;
  title: string;
  url: string;
  boat_type: string | null;
  segment?: string | null;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  country?: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  engine_info: string | null;
  description: string | null;
  hull_material: string | null;
  engine_hours?: number | null;
  source?: string | null;
  scraped_at?: string;
  /** Present only when Edge loads extra columns for normalization (stripped from API responses). */
  specs_raw?: unknown;
}

export interface DealInsight {
  fairPrice: number | null;
  gapPct: number | null;
  confidence: "low" | "medium" | "high";
  label: "Great deal" | "Fair" | "Overpriced" | "No market data";
  shortReason: string;
}

/** Comparable rows returned to the client (same pool as card/modal scoring). */
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

export interface ListingDealPayload {
  insight: DealInsight;
  evalResult: EvalResult | null;
  comparables: DealComparableSnapshot[];
}

function snapshotComparables(comps: CachedListingRow[]): DealComparableSnapshot[] {
  return comps.map((c) => ({
    title: c.title || "Comparable boat",
    url: c.url || "",
    price_eur: Number(c.price_eur),
    length_feet: Number(c.length_feet),
    year: c.year ?? null,
    location: c.location ?? null,
    image_url: c.image_url ?? null,
    engine_info: c.engine_info ?? null,
    description: c.description ? String(c.description).slice(0, 600) : null,
    boat_type: c.boat_type ?? null,
  }));
}

const currentYear = () => new Date().getFullYear();

/** Group listings by boat_type + segment (strict peer bucket). */
export function buildMarketIndex(rows: CachedListingRow[]): Map<string, CachedListingRow[]> {
  const m = new Map<string, CachedListingRow[]>();
  for (const r of rows) {
    if (!r.boat_type || !r.segment) continue;
    const k = `${r.boat_type}:${String(r.segment)}`;
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}

const YEAR_BAND = 2;
const LENGTH_BAND_FT = 3;
const MIN_COMPARABLE_COUNT = 3;

function comparablesForListing(listing: CachedListingRow, index: Map<string, CachedListingRow[]>): CachedListingRow[] {
  if (!listing.boat_type || !listing.segment || !listing.year || !listing.length_feet) return [];
  const key = `${listing.boat_type}:${String(listing.segment)}`;
  const pool = index.get(key);
  if (!pool?.length) return [];
  const y = listing.year;
  const lf = listing.length_feet;
  return pool
    .filter(
      (c) =>
        c.id !== listing.id &&
        c.price_eur &&
        c.length_feet &&
        c.year &&
        c.segment &&
        c.boat_type === listing.boat_type &&
        c.segment === listing.segment &&
        Math.abs((c.year || 0) - y) <= YEAR_BAND &&
        Math.abs((c.length_feet || 0) - lf) <= LENGTH_BAND_FT,
    )
    .slice(0, 60);
}

export function getListingDealPayload(listing: CachedListingRow, index: Map<string, CachedListingRow[]>): ListingDealPayload {
  const noInsight = (shortReason: string): ListingDealPayload => ({
    insight: {
      fairPrice: null,
      gapPct: null,
      confidence: "low",
      label: "No market data",
      shortReason,
    },
    evalResult: null,
    comparables: [],
  });

  if (!listing.price_eur || !listing.length_feet || !listing.year || !listing.segment || !listing.boat_type) {
    return noInsight("Missing year/length/price/segment/boat_type");
  }

  const comps = comparablesForListing(listing, index);

  if (comps.length < MIN_COMPARABLE_COUNT) {
    return {
      insight: {
        fairPrice: null,
        gapPct: null,
        confidence: "low",
        label: "No market data",
        shortReason: "Too few segment-matched comparables",
      },
      evalResult: null,
      comparables: snapshotComparables(comps),
    };
  }

  const sorted = comps.map((c) => Number(c.price_eur)).sort((a, b) => a - b);
  const fairPrice = sorted[Math.floor(sorted.length / 2)];
  const rawGapPct = ((fairPrice - Number(listing.price_eur)) / Number(listing.price_eur)) * 100;
  let qualityScore = 100;
  const age = listing.year ? currentYear() - listing.year : null;
  const desc = (listing.description || "").toLowerCase();
  const eng = (listing.engine_info || "").toLowerCase();

  if (age !== null) {
    if (age > 35) qualityScore -= 32;
    else if (age > 30) qualityScore -= 24;
    else if (age > 25) qualityScore -= 16;
    else if (age > 15) qualityScore -= 6;
  }
  if (listing.engine_info && /\b(problem|fault|needs|repair|non funzionante|issue)\b/i.test(eng)) qualityScore -= 25;
  if (listing.engine_info && /\bnew engine|rebuilt|overhauled\b/i.test(eng)) qualityScore += 8;
  if (listing.engine_hours && listing.engine_hours > 4500) qualityScore -= 25;
  else if (listing.engine_hours && listing.engine_hours > 3000) qualityScore -= 15;
  if (!listing.engine_hours) qualityScore -= 8;
  if (!listing.hull_material) qualityScore -= 10;
  if (/\b(osmosis|blister|damage|damaged|leak|not working|needs repair|project boat|collision|grounding)\b/i.test(desc)) {
    qualityScore -= 35;
  }
  if (!listing.description || listing.description.length < 80) qualityScore -= 8;
  if (!listing.description && !listing.engine_info) qualityScore -= 10;

  qualityScore = Math.max(25, Math.min(100, qualityScore));
  const qualityWeight = qualityScore / 100;
  const gapPct = rawGapPct * qualityWeight;
  const confidence: DealInsight["confidence"] =
    comps.length >= 18 ? "high" : comps.length >= 10 ? "medium" : "low";

  const engineText = (listing.engine_info || "").toLowerCase();
  const descriptionText = (listing.description || "").toLowerCase();
  const inferredEngine =
    listing.engine_hours && listing.engine_hours > 4500
      ? "bad"
      : listing.engine_hours && listing.engine_hours > 3000
        ? "average"
        : /\b(problem|fault|needs|repair|issue|non funzionante)\b/i.test(engineText)
          ? "bad"
          : "good";
  const inferredHull = /\b(osmosis|blister)\b/i.test(descriptionText)
    ? "osmosis"
    : /\b(damage|damaged|collision|grounding|leak)\b/i.test(descriptionText)
      ? "damaged"
      : "good";
  const inferredSails = listing.boat_type === "powerboat" ? "none" : "average";

  const comparableInputs = comps.map((c) => ({
    price_eur: Number(c.price_eur),
    length_feet: Number(c.length_feet),
    year: c.year ?? null,
    /** Must match listing segment so evaluateBoat cohort filters (segOk) do not drop every peer. */
    segment: (c.segment ?? listing.segment) as BoatSegment | null,
    title: c.title,
    url: c.url,
    image_url: c.image_url,
    location: c.location,
    engine_info: c.engine_info,
    description: c.description || undefined,
  }));

  const evalResult = evaluate({
    boatType: (listing.boat_type === "powerboat" ? "powerboat" : "sailboat") as BoatType,
    segment: listing.segment || null,
    year: listing.year,
    price: Number(listing.price_eur),
    lengthFt: Number(listing.length_feet),
    engine: inferredEngine,
    hull: inferredHull,
    sails: inferredSails,
    engineHours: listing.engine_hours ?? undefined,
    hullMaterial: listing.hull_material ?? undefined,
    comparables: comparableInputs,
  });

  const evalScore = evalResult.score;

  let insight: DealInsight;
  if (gapPct >= 12 && qualityScore >= 60 && evalScore >= 65) {
    insight = {
      fairPrice,
      gapPct,
      confidence,
      label: "Great deal",
      shortReason: `~${Math.round(gapPct)}% below peers (quality-adjusted)`,
    };
  } else if (gapPct <= -10) {
    insight = {
      fairPrice,
      gapPct,
      confidence,
      label: "Overpriced",
      shortReason: `~${Math.round(Math.abs(gapPct))}% above peers`,
    };
  } else {
    insight = {
      fairPrice,
      gapPct,
      confidence,
      label: "Fair",
      shortReason: "Near market median",
    };
  }

  return {
    insight,
    evalResult,
    comparables: snapshotComparables(comps),
  };
}

export function getDealInsight(listing: CachedListingRow, index: Map<string, CachedListingRow[]>): DealInsight {
  return getListingDealPayload(listing, index).insight;
}

export function listingDealPayloadsForListingIds(
  listings: CachedListingRow[],
  index: Map<string, CachedListingRow[]>,
): Record<string, ListingDealPayload> {
  const out: Record<string, ListingDealPayload> = {};
  for (const listing of listings) {
    out[listing.id] = getListingDealPayload(listing, index);
  }
  return out;
}

export function insightsForListingIds(
  listings: CachedListingRow[],
  index: Map<string, CachedListingRow[]>,
): Record<string, DealInsight> {
  const payloads = listingDealPayloadsForListingIds(listings, index);
  return Object.fromEntries(Object.entries(payloads).map(([id, p]) => [id, p.insight]));
}

/** Same diversification heuristic as the landing page strip. */
export function pickTopDealCards(
  candidates: CachedListingRow[],
  index: Map<string, CachedListingRow[]>,
  max = 3,
): { listing: CachedListingRow; payload: ListingDealPayload }[] {
  const scored = candidates
    .map((listing) => ({ listing, payload: getListingDealPayload(listing, index) }))
    .filter(
      (x) =>
        x.payload.insight.label === "Great deal" &&
        x.payload.insight.gapPct !== null &&
        Math.abs(x.payload.insight.gapPct || 0) <= 90,
    )
    .sort((a, b) => (b.payload.insight.gapPct || 0) - (a.payload.insight.gapPct || 0));

  const picked: { listing: CachedListingRow; payload: ListingDealPayload }[] = [];
  const seenDealPercents = new Set<number>();
  const seenBoatTypes = new Set<string>();
  for (const candidate of scored) {
    const roundedGap = Math.round(candidate.payload.insight.gapPct || 0);
    if (seenDealPercents.has(roundedGap)) continue;
    const candidateType = candidate.listing.boat_type || "unknown";
    if (picked.length < 2 && seenBoatTypes.has(candidateType)) continue;
    seenDealPercents.add(roundedGap);
    seenBoatTypes.add(candidateType);
    picked.push(candidate);
    if (picked.length >= max) break;
  }
  return picked;
}

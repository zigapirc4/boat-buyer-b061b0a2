import { normalizeListingUrl } from "@scrapeShared/listingSites";

export type ScrapeFreeTargetRow = {
  url?: string;
  status?: string;
  reason?: string;
};

const MESSAGES: Record<string, string> = {
  fetch_failed:
    "The listing page could not be downloaded (timeout, block, or empty response). Open the URL in your browser and paste the full listing link.",
  incomplete_listing:
    "After scraping, this page still missed required fields (price, year, length, non-empty description and page text, images, or enough specs). Use the direct listing URL (not search/category). On marketplaces with thin HTML, try another listing or site.",
  ai_details_failed:
    "AI analysis could not complete for this listing (server misconfiguration or upstream error). Try again in a moment.",
  boat_type_ai_failed:
    "Could not classify this listing as sailboat vs powerboat (AI unavailable or unclear response). Try again in a moment.",
  ai_location_failed:
    "A reliable boating location could not be resolved for this listing, so it was not saved.",
  persist_quality_gate:
    "Scraped data did not meet minimum save rules (needs price or both year and length).",
  persist_failed:
    "Saving to the database failed (network, permissions, or duplicate constraint). Try again; if it persists, check Supabase logs.",
  skipped_existing: "",
  listing_error: "Scraper hit an unexpected error while processing this URL.",
  unknown_site: "This hostname is not handled by the importer.",
  generic_skip:
    "Saving was skipped, but the server did not report which step failed. Redeploy the latest scrape-free function. Typical causes: incomplete scrape, AI analysis unavailable, or location could not be resolved.",
};

export function pickScrapeFreeTargetRow(
  results: ScrapeFreeTargetRow[] | undefined,
  normalizedUrl: string,
): ScrapeFreeTargetRow | undefined {
  if (!results?.length) return undefined;
  const target = normalizeListingUrl(normalizedUrl);
  const match = results.find((r) => r.url && normalizeListingUrl(r.url) === target);
  return match ?? results[0];
}

export function messageForScrapeFreeReason(reason: string | undefined, status: string | undefined): string {
  if (!reason) {
    if (status === "error") return MESSAGES.fetch_failed;
    return MESSAGES.generic_skip;
  }
  return MESSAGES[reason] ?? MESSAGES.generic_skip;
}

export type ScrapeFreeImportInterpretation =
  | { outcome: "poll_cache" }
  | { outcome: "use_existing_row" }
  | { outcome: "fail"; message: string };

/** Maps scrape-free targeted JSON to what the UI should do next. */
export function interpretScrapeFreeImportResponse(
  data: { results?: ScrapeFreeTargetRow[]; stats?: { errors?: number } },
  normalizedUrl: string,
): ScrapeFreeImportInterpretation {
  const row = pickScrapeFreeTargetRow(data.results, normalizedUrl);
  const statsErrors = data.stats?.errors ?? 0;

  if (!row) {
    return {
      outcome: "fail",
      message:
        statsErrors > 0
          ? MESSAGES.fetch_failed
          : "Import finished without a listing result. Try again or check that this is a supported listing URL.",
    };
  }

  const st = String(row.status ?? "").toLowerCase();

  if (st === "error") {
    return {
      outcome: "fail",
      message: messageForScrapeFreeReason(row.reason, "error"),
    };
  }

  if (st === "skip") {
    if (row.reason === "skipped_existing") {
      return { outcome: "use_existing_row" };
    }
    return {
      outcome: "fail",
      message: messageForScrapeFreeReason(row.reason, "skip"),
    };
  }

  if (st === "insert" || st === "update") {
    return { outcome: "poll_cache" };
  }

  return {
    outcome: "fail",
    message: `${MESSAGES.generic_skip} (status: ${row.status || "missing"})`,
  };
}

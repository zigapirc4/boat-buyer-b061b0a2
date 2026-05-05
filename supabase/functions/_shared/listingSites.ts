/**
 * Targeted listing hosts handled by scrape-free (`urls: [...]` path).
 * Order matters: first substring match wins (keep aligned with legacy scrape-free chain).
 */
export const SCRAPE_FREE_TARGET_SITE_SUFFIXES = [
  "trovobarche.it",
  "mornar.net",
  "boat24.com",
  "scanboat.com",
  "blocket.se",
  "findaly.co",
  "yachtall.com",
  "nautano.com",
  "boatshop24",
] as const;

export type ScrapeFreeTargetSite = (typeof SCRAPE_FREE_TARGET_SITE_SUFFIXES)[number];

/** Canonical URL for matching DB rows and scrape-free results (scheme, no hash, no trailing slash on path). */
export function normalizeListingUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(href);
    u.hash = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
      u.pathname = path;
    }
    return u.toString();
  } catch {
    return href;
  }
}

/** Same hostname logic as scrape-free targeted imports. */
export function detectScrapeFreeTargetSite(rawUrl: string): ScrapeFreeTargetSite | null {
  try {
    const normalized = normalizeListingUrl(rawUrl);
    const h = new URL(normalized).hostname.replace("www.", "").replace("www2.", "").toLowerCase();
    for (const site of SCRAPE_FREE_TARGET_SITE_SUFFIXES) {
      if (h.includes(site)) return site;
    }
    return null;
  } catch {
    return null;
  }
}

export function supportedListingSitesHumanList(): string {
  return SCRAPE_FREE_TARGET_SITE_SUFFIXES.join(", ");
}

/** Matches rows saved as `.../608427` vs `.../608427/` (same listing). */
export function cachedListingUrlVariants(url: string): string[] {
  const base = url.trim().split("#")[0];
  const set = new Set<string>();
  set.add(base);
  const stripped = base.replace(/\/+$/, "");
  if (stripped.length > 8) {
    set.add(stripped);
    set.add(`${stripped}/`);
  }
  return [...set];
}

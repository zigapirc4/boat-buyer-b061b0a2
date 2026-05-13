/** Single-line place label for cards/modals (uses `country` when set to avoid duplicating country in text). */
export function formatListingPlaceLine(listing: {
  country?: string | null;
  location?: string | null;
}): string | null {
  const loc = listing.location?.replace(/\s+/g, " ").trim() || "";
  const c = listing.country?.replace(/\s+/g, " ").trim() || "";
  if (!loc && !c) return null;
  if (c && loc.includes("->")) {
    const right = loc
      .split("->")
      .slice(1)
      .join("->")
      .trim();
    return right ? `${c} → ${right}` : c;
  }
  if (c && loc && !loc.toLowerCase().includes(c.toLowerCase())) return `${c} · ${loc}`;
  return loc || c || null;
}

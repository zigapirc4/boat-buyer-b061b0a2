/**
 * Derive a canonical English `country` value from the human-facing `location` string
 * (e.g. "Croatia->Split", "Sevnica, Slovenia", "Germany").
 */

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "u.s": "United States",
  "u.s.": "United States",
  america: "United States",
  "united states": "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "u.k": "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "bosnia & herzegovina": "Bosnia and Herzegovina",
  "north macedonia": "North Macedonia",
  "czech republic": "Czechia",
  "czech rep": "Czechia",
  "republic of ireland": "Ireland",
  "the bahamas": "Bahamas",
  "trinidad and tobago": "Trinidad and Tobago",
  "new zealand": "New Zealand",
  "south africa": "South Africa",
  "south korea": "South Korea",
  "north korea": "North Korea",
  "russian federation": "Russia",
  "russia (federation)": "Russia",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
};

function titleCaseCountryWords(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;
  return t
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-" || part === "") return part;
      if (part.length <= 2 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Returns a stable display country for `cached_listings.country`, or null if unknown.
 */
export function deriveCanonicalCountryFromLocation(location: string | null | undefined): string | null {
  if (location == null || typeof location !== "string") return null;
  const clean = location.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  let raw = "";

  if (clean.includes("->")) {
    raw = clean.split("->")[0]!.trim();
  } else if (clean.includes(",")) {
    const segs = clean.split(",").map((s) => s.trim()).filter(Boolean);
    if (segs.length >= 2) {
      const last = segs[segs.length - 1]!;
      if (/^[A-Z]{2}$/.test(last)) {
        raw = "United States";
      } else {
        raw = last;
      }
    } else {
      raw = segs[0]!;
    }
  } else {
    raw = clean;
  }

  if (!raw) return null;
  raw = raw.replace(/\s+/g, " ").trim();
  if (raw.length < 2 || raw.length > 80) return null;
  if (!/[a-z]/i.test(raw)) return null;

  const key = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];

  return titleCaseCountryWords(raw);
}

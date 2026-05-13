export interface SavedBoat {
  id: string;
  model: string;
  score: number;
  verdict: string;
  date: string;
}

export interface SavedListing {
  id: string;
  title: string;
  url: string;
  boat_type: string | null;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  /** Canonical country (English) for filters/geo; optional on older saved rows. */
  country?: string | null;
  image_url: string | null;
  source: string | null;
  savedAt: string;
}

const STORAGE_KEY = "boatbuyer_saved";
const LISTINGS_KEY = "boatbuyer_saved_listings";

export function getSavedBoats(): SavedBoat[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveBoat(boat: Omit<SavedBoat, "id" | "date">) {
  const boats = getSavedBoats();
  boats.unshift({ ...boat, id: crypto.randomUUID(), date: new Date().toLocaleDateString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boats));
}

export function deleteBoat(id: string) {
  const boats = getSavedBoats().filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boats));
}

export function getSavedListings(): SavedListing[] {
  try {
    return JSON.parse(localStorage.getItem(LISTINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveListing(listing: Omit<SavedListing, "savedAt">) {
  const listings = getSavedListings();
  if (listings.some(l => l.id === listing.id)) return; // no duplicates
  listings.unshift({ ...listing, savedAt: new Date().toISOString() });
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function removeListing(id: string) {
  const listings = getSavedListings().filter(l => l.id !== id);
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function isListingSaved(id: string): boolean {
  return getSavedListings().some(l => l.id === id);
}

export interface SavedBoat {
  id: string;
  model: string;
  score: number;
  verdict: string;
  date: string;
}

const STORAGE_KEY = "boatbuyer_saved";

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

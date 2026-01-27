const STORAGE_KEY_PREFIX = "cozytab:chessSide";

function makeKey(itemId: string): string {
  return `${STORAGE_KEY_PREFIX}:${itemId}`;
}

export function getSavedChessSide(itemId: string): "white" | "black" | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(makeKey(itemId));
    if (value === "white" || value === "black") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveChessSide(itemId: string, side: "white" | "black"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(makeKey(itemId), side);
  } catch {
    // Ignore storage errors
  }
}

export function clearChessSide(itemId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(makeKey(itemId));
  } catch {
    // Ignore storage errors
  }
}

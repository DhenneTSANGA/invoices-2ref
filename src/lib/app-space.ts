export type AppSpace = "facturation" | "prospection";

const KEY = "2rhub-last-space";

export function rememberSpace(space: AppSpace) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, space);
  } catch {
    // ignore quota / private mode
  }
}

export function lastSpace(): AppSpace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "facturation" || raw === "prospection") return raw;
  } catch {
    // ignore
  }
  return null;
}

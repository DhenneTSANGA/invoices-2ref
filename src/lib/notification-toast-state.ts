const STORAGE_KEY = "2ref-toasted-notification-ids";
const MAX_STORED = 500;

export function loadToastedNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function saveToastedNotificationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = [...ids].slice(-MAX_STORED);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function rememberToastedNotificationIds(
  ids: Set<string>,
  notificationIds: Iterable<string>,
) {
  let changed = false;
  for (const id of notificationIds) {
    if (!ids.has(id)) {
      ids.add(id);
      changed = true;
    }
  }
  if (changed) saveToastedNotificationIds(ids);
}

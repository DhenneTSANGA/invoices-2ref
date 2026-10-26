/**
 * Après un déploiement, un onglet resté ouvert référence encore les fichiers JS
 * de l'ancienne version (hash différent) : leur import échoue. On recharge alors
 * la page une fois pour récupérer la nouvelle version, au lieu d'afficher l'erreur.
 */

const RELOAD_KEY = "2r-hub:stale-chunk-reload-at";
/** Pas de second rechargement automatique dans cet intervalle (anti-boucle). */
const RELOAD_GUARD_MS = 15_000;

const STALE_CHUNK_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return STALE_CHUNK_PATTERN.test(message);
}

/** Recharge la page ; false si un rechargement vient déjà d'avoir lieu. */
export function reloadForNewVersion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (last && Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* stockage indisponible : on recharge quand même une fois */
  }
  window.location.reload();
  return true;
}

/** Intercepte les échecs de préchargement Vite (survol d'un lien, navigation). */
export function installStaleChunkHandler(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPreloadError = (event: Event) => {
    if (reloadForNewVersion()) event.preventDefault();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}

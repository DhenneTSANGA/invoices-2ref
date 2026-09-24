function normalizePublicUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, "");
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/$/, "");
}

function originFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizePublicUrl(window.location.origin);
  } catch {
    return null;
  }
}

/** URL publique de l’app — toujours absolue (liens e-mails, invitations). */
export function appPublicUrl(): string {
  const fromEnv =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (fromEnv) return normalizePublicUrl(fromEnv);
  const fromWindow = originFromWindow();
  if (fromWindow) return fromWindow;
  return "http://localhost:8080";
}

export function absoluteAppUrl(path: string): string {
  const base = appPublicUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

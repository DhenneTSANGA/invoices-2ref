import { getRequest } from "@tanstack/react-start/server";

function normalizePublicUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, "");
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/$/, "");
}

function originFromRequest(): string | null {
  try {
    const request = getRequest();
    const headerOrigin = request.headers.get("origin")?.trim();
    if (headerOrigin) return normalizePublicUrl(headerOrigin);

    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    if (!host) return null;
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return normalizePublicUrl(`${proto}://${host}`);
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
  const fromReq = originFromRequest();
  if (fromReq) return fromReq;
  return "http://localhost:8080";
}

export function absoluteAppUrl(path: string): string {
  const base = appPublicUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

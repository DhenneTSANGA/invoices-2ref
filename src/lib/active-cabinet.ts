import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { Cabinet } from "@prisma/client";
import { isCabinet } from "@/lib/cabinets";

export const ACTIVE_CABINET_COOKIE = "2r-active-cabinet";

export function readActiveCabinetCookie(): Cabinet | null {
  try {
    const raw = getCookies()[ACTIVE_CABINET_COOKIE];
    if (isCabinet(raw)) return raw;
  } catch {
    // hors contexte requête
  }
  return null;
}

export function writeActiveCabinetCookie(cabinet: Cabinet) {
  setCookie(ACTIVE_CABINET_COOKIE, cabinet, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
  });
}

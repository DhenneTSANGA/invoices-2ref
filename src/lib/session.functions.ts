import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { mapStaff } from "@/lib/mappers";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { syncStaffMember } from "@/lib/staff-sync";
import {
  readActiveCabinetCookie,
  writeActiveCabinetCookie,
} from "@/lib/active-cabinet";
import { resolveCabinet } from "@/lib/roles";
import type { StaffMember } from "@/store/types";

export type AppSession = {
  user: { id: string; email: string };
  staff: StaffMember;
  /** Cabinet effectif pour les données (cookie pour super_admin). */
  activeCabinet: Cabinet;
} | null;

/** Cache mémoire — évite Prisma + sync à chaque server fn. */
const SESSION_TTL_MS = 5 * 60_000;
const sessionMemo = new Map<
  string,
  { at: number; value: AppSession; cabinetKey: string }
>();

/** Déduplication des résolutions concurrentes (même process). */
const inflight = new Map<string, Promise<AppSession>>();

function superAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAuthRateLimit(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; message?: string };
  return (
    e.status === 429 ||
    e.code === "over_request_rate_limit" ||
    /rate limit/i.test(e.message ?? "")
  );
}

/**
 * Utilisateur Auth sans appel réseau Auth :
 * getSession() lit le JWT des cookies (rapide).
 * getUser() valide auprès de Supabase — à éviter en boucle (429).
 */
async function resolveAuthUser(): Promise<User | null> {
  const supabase = createSupabaseServer();

  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.user) {
      return data.session.user;
    }
  } catch (err) {
    if (!isAuthRateLimit(err)) {
      console.error("[session] getSession", err);
    }
  }

  // Fallback rare : JWT absent / expiré côté client cookies — une seule validation réseau
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    if (isAuthRateLimit(err)) {
      console.warn("[session] Auth rate limited — session indisponible temporairement");
      return null;
    }
    console.error("[session] getUser", err);
    return null;
  }
}

async function buildAppSession(user: User): Promise<AppSession> {
  const cookieCabinet = readActiveCabinetCookie();
  const cacheKey = `${user.id}:${cookieCabinet ?? ""}`;
  const cached = sessionMemo.get(user.id);
  if (
    cached &&
    Date.now() - cached.at < SESSION_TTL_MS &&
    cached.cabinetKey === cacheKey
  ) {
    const payloadPeek = staffFromAuthUser(user);
    if (!cached.value?.staff.avatarUrl && payloadPeek.avatarUrl) {
      sessionMemo.delete(user.id);
    } else {
      return cached.value;
    }
  }

  let staffRow = await prisma.staffMember.findUnique({
    where: { id: user.id },
  });

  const payload = staffFromAuthUser(user);
  const isSaEmail = superAdminEmails().has(
    (user.email ?? payload.email).toLowerCase(),
  );

  if (!staffRow) {
    // Pas encore onboardé (Google) — pas de session app complète
    if (!payload.cabinet && !isSaEmail) return null;
    staffRow = await syncStaffMember({
      ...payload,
      role: isSaEmail ? "super_admin" : payload.role ?? "member",
      cabinet: isSaEmail ? null : payload.cabinet ?? null,
    });
  } else {
    if (isSaEmail && staffRow.role !== "super_admin") {
      staffRow = await prisma.staffMember.update({
        where: { id: staffRow.id },
        data: { role: "super_admin", cabinet: null },
      });
    }
    if (payload.avatarUrl && payload.avatarUrl !== staffRow.avatarUrl) {
      staffRow = await syncStaffMember({
        ...payload,
        role: staffRow.role,
        cabinet: staffRow.cabinet,
      });
    }
  }

  // Membre/admin sans cabinet → onboarding requis
  if (staffRow.role !== "super_admin" && !staffRow.cabinet) {
    return null;
  }

  const staff = mapStaff(staffRow);
  let activeCabinet: Cabinet;
  try {
    activeCabinet = resolveCabinet(
      staff.role,
      staff.cabinet,
      cookieCabinet,
    );
  } catch {
    return null;
  }

  if (staff.role === "super_admin" && cookieCabinet !== activeCabinet) {
    writeActiveCabinetCookie(activeCabinet);
  }

  const value: AppSession = {
    user: { id: user.id, email: user.email ?? staff.email },
    staff,
    activeCabinet,
  };
  sessionMemo.set(user.id, {
    at: Date.now(),
    value,
    cabinetKey: `${user.id}:${activeCabinet}`,
  });
  return value;
}

/**
 * Session courante — JWT local + staff Prisma + cabinet actif.
 * Évite getUser() systématique (cause des 429 Auth).
 */
export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppSession> => {
    const user = await resolveAuthUser();
    if (!user) return null;

    const existing = inflight.get(user.id);
    if (existing) return existing;

    const promise = buildAppSession(user).finally(() => {
      inflight.delete(user.id);
    });
    inflight.set(user.id, promise);
    return promise;
  },
);

export const setActiveCabinet = createServerFn({ method: "POST" })
  .validator(z.object({ cabinet: z.enum(["conseil", "expertise_fiscale"]) }))
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (session.staff.role !== "super_admin") {
      throw new Error("Réservé au super admin");
    }
    writeActiveCabinetCookie(data.cabinet);
    sessionMemo.delete(session.user.id);
    return { ok: true, cabinet: data.cabinet };
  });

export function clearSessionMemo(userId?: string) {
  if (userId) {
    sessionMemo.delete(userId);
    inflight.delete(userId);
  } else {
    sessionMemo.clear();
    inflight.clear();
  }
}

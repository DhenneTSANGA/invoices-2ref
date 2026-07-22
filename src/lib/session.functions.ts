import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet } from "@prisma/client";
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

const SESSION_TTL_MS = 15_000;
const sessionMemo = new Map<string, { at: number; value: AppSession; cabinetKey: string }>();

function superAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Session courante — JWT + staff Prisma + cabinet actif.
 */
export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppSession> => {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user) return null;

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
      if (
        payload.avatarUrl &&
        payload.avatarUrl !== staffRow.avatarUrl
      ) {
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
  if (userId) sessionMemo.delete(userId);
  else sessionMemo.clear();
}

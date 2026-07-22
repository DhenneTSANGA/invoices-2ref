import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { mapStaff } from "@/lib/mappers";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { syncStaffMember } from "@/lib/staff-sync";
import type { StaffMember } from "@/store/types";

export type AppSession = {
  user: { id: string; email: string };
  staff: StaffMember;
} | null;

const SESSION_TTL_MS = 30_000;
const sessionMemo = new Map<string, { at: number; value: AppSession }>();

/**
 * Session courante — JWT local + cache court (30s) pour éviter
 * un aller-retour Prisma à chaque navigation.
 */
export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppSession> => {
    const supabase = createSupabaseServer();
    // getUser() rafraîchit les métadonnées (avatar Google inclus)
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user) return null;

    const cached = sessionMemo.get(user.id);
    if (cached && Date.now() - cached.at < SESSION_TTL_MS) {
      // Si l'avatar manque encore en cache mais est présent côté Auth, forcer le refresh
      const payloadPeek = staffFromAuthUser(user);
      if (
        !cached.value?.staff.avatarUrl &&
        payloadPeek.avatarUrl
      ) {
        sessionMemo.delete(user.id);
      } else {
        return cached.value;
      }
    }

    let staffRow = await prisma.staffMember.findUnique({
      where: { id: user.id },
    });

    const payload = staffFromAuthUser(user);
    if (!staffRow) {
      staffRow = await syncStaffMember(payload);
    } else if (
      payload.avatarUrl &&
      payload.avatarUrl !== staffRow.avatarUrl
    ) {
      // Rafraîchir la photo Google quand elle change ou manquait
      staffRow = await syncStaffMember(payload);
    }

    const value: AppSession = {
      user: { id: user.id, email: user.email ?? staffRow.email },
      staff: mapStaff(staffRow),
    };
    sessionMemo.set(user.id, { at: Date.now(), value });
    return value;
  },
);

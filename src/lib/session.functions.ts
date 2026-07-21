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
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (error || !user) return null;

    const cached = sessionMemo.get(user.id);
    if (cached && Date.now() - cached.at < SESSION_TTL_MS) {
      return cached.value;
    }

    let staffRow = await prisma.staffMember.findUnique({
      where: { id: user.id },
    });

    if (!staffRow) {
      const payload = staffFromAuthUser(user);
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

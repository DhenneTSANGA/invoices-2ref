import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createAuthAdmin, appPublicUrl } from "@/lib/supabase-admin";
import { mapStaff } from "@/lib/mappers";
import { syncStaffMember } from "@/lib/staff-sync";
import { staffFromAuthUser } from "@/lib/staff-parse";
import {
  createStaffWithPasswordSchema,
  inviteStaffSchema,
  onboardingSchema,
  profileUpdateSchema,
} from "@/lib/auth-schemas";
import {
  clearSessionMemo,
  getCurrentSession,
} from "@/lib/session.functions";
import {
  canInviteStaff,
  canManageAdminRequests,
  canPromoteOrDemoteAdmins,
  isSuperAdmin,
} from "@/lib/roles";
import { jobTitleLabel, normalizeJobTitleValue } from "@/lib/cabinets";
import {
  INVITE_ONLY_LOGIN_HINT,
  isPublicSelfSignupEnabled,
} from "@/lib/access-policy";
import { humanAuthError } from "@/lib/auth-errors";
import { userMustSetPassword } from "@/lib/auth-password";

function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.SUPER_ADMIN_EMAIL ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export const getAuthBootstrap = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createSupabaseServer();
    let user =
      (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return null;
        user = data.user;
      } catch {
        return null;
      }
    }

    // Bootstrap immédiat si email super admin (évite l’écran onboarding)
    if (isSuperAdminEmail(user.email)) {
      const payload = staffFromAuthUser(user);
      await syncStaffMember({
        ...payload,
        role: "super_admin",
        cabinet: null,
      });
      clearSessionMemo(user.id);
    }

    if (userMustSetPassword(user)) {
      return {
        status: "needs_password" as const,
        user: { id: user.id, email: user.email ?? "" },
      };
    }

    const session = await getCurrentSession();
    if (session) {
      return {
        status: "ready" as const,
        user: { id: user.id, email: user.email ?? session.staff.email },
        staff: session.staff,
        activeCabinet: session.activeCabinet,
      };
    }

    const existing = await prisma.staffMember.findUnique({
      where: { id: user.id },
    });

    // Mode invitation : pas d’onboarding libre pour les comptes Auth non provisionnés
    if (
      !isPublicSelfSignupEnabled() &&
      !isSuperAdminEmail(user.email) &&
      !existing
    ) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      return {
        status: "access_denied" as const,
        message: INVITE_ONLY_LOGIN_HINT,
      };
    }

    const suggested = staffFromAuthUser(user);
    const existingJob =
      existing?.jobTitle != null
        ? normalizeJobTitleValue(existing.jobTitle)
        : null;

    return {
      status: "needs_onboarding" as const,
      user: { id: user.id, email: user.email ?? suggested.email },
      suggested: {
        firstName: existing?.firstName ?? suggested.firstName,
        lastName: existing?.lastName ?? suggested.lastName,
        jobTitle:
          existingJob ??
          normalizeJobTitleValue(suggested.jobTitle) ??
          "",
        phone: existing?.phone ?? suggested.phone ?? "",
        cabinet: existing?.cabinet ?? suggested.cabinet ?? null,
        avatarUrl: existing?.avatarUrl ?? suggested.avatarUrl ?? null,
      },
    };
  },
);

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator(onboardingSchema)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServer();
    let user =
      (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) {
      const { data: auth, error } = await supabase.auth.getUser();
      if (error || !auth.user) throw new Error("Non authentifié");
      user = auth.user;
    }

    if (!isPublicSelfSignupEnabled() && !isSuperAdminEmail(user.email)) {
      const existing = await prisma.staffMember.findUnique({
        where: { id: user.id },
      });
      if (!existing) {
        throw new Error(INVITE_ONLY_LOGIN_HINT);
      }
    }

    const suggested = staffFromAuthUser(user);
    const asSuperAdmin = isSuperAdminEmail(user.email);
    const staff = await syncStaffMember({
      id: user.id,
      email: user.email ?? suggested.email,
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.jobTitle,
      phone: data.phone?.trim() || null,
      avatarUrl: suggested.avatarUrl,
      cabinet: asSuperAdmin ? null : data.cabinet,
      role: asSuperAdmin ? "super_admin" : "member",
    });

    clearSessionMemo(user.id);
    return mapStaff(staff);
  });

/** Création de compte sans e-mail Supabase (mot de passe défini par le super admin). */
export const createStaffWithPassword = createServerFn({ method: "POST" })
  .validator(createStaffWithPasswordSchema)
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canInviteStaff(session.staff.role)) {
      throw new Error("Réservé au super administrateur");
    }

    const email = data.email.trim().toLowerCase();
    const existingStaff = await prisma.staffMember.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingStaff) {
      throw new Error("Un collaborateur avec cet e-mail existe déjà");
    }

    const admin = createAuthAdmin();
    const staffMeta = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      jobTitle: data.jobTitle,
      email,
      phone: data.phone?.trim() || null,
      cabinet: data.cabinet,
    };

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        staff: staffMeta,
        first_name: staffMeta.firstName,
        last_name: staffMeta.lastName,
        full_name: `${staffMeta.firstName} ${staffMeta.lastName}`,
        job_title: staffMeta.jobTitle,
        phone: staffMeta.phone,
        cabinet: staffMeta.cabinet,
        invited_role: data.role,
        must_set_password: false,
        suggest_password_change: true,
      },
    });

    if (error || !created.user) {
      throw new Error(
        humanAuthError(
          error?.message ?? "Impossible de créer le compte",
          "Impossible de créer ce compte. Vérifiez l’e-mail et réessayez.",
        ),
      );
    }

    try {
      const staff = await syncStaffMember({
        id: created.user.id,
        email,
        firstName: staffMeta.firstName,
        lastName: staffMeta.lastName,
        jobTitle: staffMeta.jobTitle,
        phone: staffMeta.phone,
        cabinet: data.cabinet,
        role: data.role,
      });

      return {
        ok: true as const,
        staff: {
          ...mapStaff(staff),
          jobTitleLabel: jobTitleLabel(staff.jobTitle),
        },
      };
    } catch (err) {
      try {
        await admin.auth.admin.deleteUser(created.user.id);
      } catch (cleanupErr) {
        console.error("[createStaffWithPassword] cleanup auth user", cleanupErr);
      }
      throw err;
    }
  });

/** Conservé : invitation par e-mail Supabase (non exposée dans l’UI par défaut). */
export const inviteStaffMember = createServerFn({ method: "POST" })
  .validator(inviteStaffSchema)
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canInviteStaff(session.staff.role)) {
      throw new Error("Réservé au super administrateur");
    }

    const email = data.email.trim().toLowerCase();
    const existingStaff = await prisma.staffMember.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingStaff) {
      throw new Error("Un collaborateur avec cet e-mail existe déjà");
    }

    const admin = createAuthAdmin();
    const redirectTo = `${appPublicUrl()}/auth/callback`;
    const staffMeta = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      jobTitle: data.jobTitle,
      email,
      phone: data.phone?.trim() || null,
      cabinet: data.cabinet,
    };

    // redirectTo doit être dans Authentication → URL Configuration → Redirect URLs
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          staff: staffMeta,
          first_name: staffMeta.firstName,
          last_name: staffMeta.lastName,
          full_name: `${staffMeta.firstName} ${staffMeta.lastName}`,
          job_title: staffMeta.jobTitle,
          phone: staffMeta.phone,
          cabinet: staffMeta.cabinet,
          invited_role: data.role,
          must_set_password: true,
        },
      },
    );

    if (error || !invited.user) {
      throw new Error(
        humanAuthError(
          error?.message ?? "Impossible d’envoyer l’invitation",
          "Impossible d’envoyer l’invitation. Vérifiez l’e-mail et réessayez.",
        ),
      );
    }

    try {
      const staff = await syncStaffMember({
        id: invited.user.id,
        email,
        firstName: staffMeta.firstName,
        lastName: staffMeta.lastName,
        jobTitle: staffMeta.jobTitle,
        phone: staffMeta.phone,
        cabinet: data.cabinet,
        role: data.role,
      });

      return {
        ok: true as const,
        staff: {
          ...mapStaff(staff),
          jobTitleLabel: jobTitleLabel(staff.jobTitle),
        },
      };
    } catch (err) {
      try {
        await admin.auth.admin.deleteUser(invited.user.id);
      } catch (cleanupErr) {
        console.error("[inviteStaffMember] cleanup auth user", cleanupErr);
      }
      throw err;
    }
  });

export const listCabinetStaff = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canManageAdminRequests(session.staff.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    const where = isSuperAdmin(session.staff.role)
      ? {}
      : { cabinet: session.activeCabinet };

    const rows = await prisma.staffMember.findMany({
      where: {
        ...where,
        role: { not: "super_admin" },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return rows.map((r) => ({
      ...mapStaff(r),
      jobTitleLabel: jobTitleLabel(r.jobTitle),
    }));
  },
);

export const listAdminRequests = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canManageAdminRequests(session.staff.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    const rows = await prisma.adminRequest.findMany({
      where: isSuperAdmin(session.staff.role)
        ? { status: "pending" }
        : {
            status: "pending",
            staff: { cabinet: session.activeCabinet },
          },
      include: { staff: true },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      staff: mapStaff(r.staff),
      jobTitleLabel: jobTitleLabel(r.staff.jobTitle),
    }));
  },
);

export const requestAdminRole = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (session.staff.role !== "member") {
      throw new Error("Vous êtes déjà administrateur");
    }

    const existing = await prisma.adminRequest.findFirst({
      where: { staffId: session.staff.id, status: "pending" },
    });
    if (existing) return { ok: true, id: existing.id };

    const row = await prisma.adminRequest.create({
      data: { staffId: session.staff.id },
    });
    return { ok: true, id: row.id };
  },
);

export const reviewAdminRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      decision: z.enum(["accepted", "rejected"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canManageAdminRequests(session.staff.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    const req = await prisma.adminRequest.findUnique({
      where: { id: data.id },
      include: { staff: true },
    });
    if (!req || req.status !== "pending") {
      throw new Error("Demande introuvable");
    }
    if (
      !isSuperAdmin(session.staff.role) &&
      req.staff.cabinet !== session.activeCabinet
    ) {
      throw new Error("Cette demande concerne un autre cabinet");
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminRequest.update({
        where: { id: req.id },
        data: {
          status: data.decision,
          reviewedAt: new Date(),
          reviewedById: session.staff.id,
        },
      });
      if (data.decision === "accepted") {
        await tx.staffMember.update({
          where: { id: req.staffId },
          data: { role: "admin" },
        });
      }
    });

    clearSessionMemo(req.staffId);
    return { ok: true };
  });

export const setStaffAdminRole = createServerFn({ method: "POST" })
  .validator(
    z.object({
      staffId: z.string(),
      role: z.enum(["member", "admin"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (!canPromoteOrDemoteAdmins(session.staff.role)) {
      throw new Error("Réservé au super administrateur");
    }

    const target = await prisma.staffMember.findUnique({
      where: { id: data.staffId },
    });
    if (!target || target.role === "super_admin") {
      throw new Error("Collaborateur introuvable");
    }

    await prisma.staffMember.update({
      where: { id: data.staffId },
      data: { role: data.role },
    });
    clearSessionMemo(data.staffId);
    return { ok: true };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    if (session.staff.role === "super_admin") {
      throw new Error("Le super admin ne peut pas supprimer ce compte ici");
    }

    const supabase = createSupabaseServer();
    const userId = session.user.id;

    await prisma.staffMember.delete({ where: { id: userId } });
    clearSessionMemo(userId);

    // Best-effort : suppression Auth (nécessite service role)
    try {
      const admin = createAuthAdmin();
      await admin.auth.admin.deleteUser(userId);
    } catch (err) {
      console.error("[deleteOwnAccount] auth delete", err);
    }

    await supabase.auth.signOut();
    return { ok: true };
  },
);

export const updateOwnProfile = createServerFn({ method: "POST" })
  .validator(profileUpdateSchema)
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");

    const jobTitle = normalizeJobTitleValue(data.jobTitle);
    if (!jobTitle) throw new Error("Poste invalide");

    const phone = data.phone.trim() || null;
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();

    const row = await prisma.staffMember.update({
      where: { id: session.staff.id },
      data: {
        firstName,
        lastName,
        jobTitle,
        phone,
      },
    });

    // Aligne les métadonnées Auth (best-effort)
    try {
      const supabase = createSupabaseServer();
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          job_title: jobTitle,
          phone,
          staff: {
            firstName,
            lastName,
            jobTitle,
            phone,
            email: session.staff.email,
            cabinet: session.staff.cabinet,
          },
        },
      });
    } catch (err) {
      console.error("[updateOwnProfile] auth metadata", err);
    }

    clearSessionMemo(session.user.id);
    return mapStaff(row);
  });

export const getMyPendingAdminRequest = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getCurrentSession();
    if (!session) return null;
    if (session.staff.role !== "member") return null;
    const row = await prisma.adminRequest.findFirst({
      where: { staffId: session.staff.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    return row
      ? { id: row.id, createdAt: row.createdAt.toISOString() }
      : null;
  },
);

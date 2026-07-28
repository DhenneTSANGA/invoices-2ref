import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { syncStaffMember } from "@/lib/staff-sync";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import {
  INVITE_ONLY_LOGIN_HINT,
  isPublicSelfSignupEnabled,
} from "@/lib/access-policy";

const bodySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  cabinet: z.enum(["conseil", "expertise_fiscale"]).optional().nullable(),
  role: z.enum(["member", "admin", "super_admin"]).optional(),
});

function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.SUPER_ADMIN_EMAIL ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export const Route = createFileRoute("/api/staff/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json(
              { error: "Données invalides", details: parsed.error.flatten() },
              { status: 400 },
            );
          }

          const supabase = createSupabaseServer();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const authUser = session?.user ?? null;

          if (!authUser) {
            return Response.json(
              { error: "Non authentifié" },
              { status: 401 },
            );
          }
          if (authUser.id !== parsed.data.id) {
            return Response.json(
              { error: "Accès refusé" },
              { status: 403 },
            );
          }

          // Mode invitation : pas de création libre via cet endpoint
          if (!isPublicSelfSignupEnabled()) {
            const existing = await prisma.staffMember.findUnique({
              where: { id: parsed.data.id },
            });
            if (!existing && !isSuperAdminEmail(authUser.email)) {
              return Response.json(
                { error: INVITE_ONLY_LOGIN_HINT },
                { status: 403 },
              );
            }
          }

          // Empêche l’élévation de privilèges via le body
          const role =
            isSuperAdminEmail(authUser.email)
              ? "super_admin"
              : parsed.data.role === "super_admin"
                ? "member"
                : (parsed.data.role ?? "member");

          const staff = await syncStaffMember({
            ...parsed.data,
            role,
            cabinet: role === "super_admin" ? null : parsed.data.cabinet,
          });
          return Response.json({ ok: true, staff });
        } catch (err) {
          console.error("[api/staff/sync]", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Erreur serveur" },
            { status: 500 },
          );
        }
      },
    },
  },
});

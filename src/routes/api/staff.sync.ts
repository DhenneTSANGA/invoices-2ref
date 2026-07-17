import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  role: z.enum(["member", "admin"]).optional(),
});

/**
 * POST /api/staff/sync — enregistre le collaborateur dans `staff_members`.
 */
export const Route = createFileRoute("/api/staff/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.issues[0]?.message ?? "Données invalides" },
              { status: 400 },
            );
          }

          const { syncStaffMember } = await import("@/lib/staff-sync");
          const staff = await syncStaffMember(parsed.data);
          return Response.json({ ok: true, staff });
        } catch (err) {
          console.error("[api/staff/sync]", err);
          return Response.json(
            {
              error:
                err instanceof Error
                  ? err.message
                  : "Impossible d’enregistrer le collaborateur",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});

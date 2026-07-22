import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { syncStaffMember } from "@/lib/staff-sync";

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
          const staff = await syncStaffMember(parsed.data);
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

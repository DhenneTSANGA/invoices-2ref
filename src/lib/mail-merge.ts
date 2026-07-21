import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { getResend } from "@/lib/resend";
import { REAL_2REF_COMPANY } from "@/lib/company-defaults";
import {
  escapeHtml,
  formatFrom,
  requireResendConfig,
  resendErrorMessage,
} from "@/lib/email";

async function requireStaff() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session.staff;
}

const mailMergeSchema = z.object({
  clientIds: z.array(z.string()).min(1, "Sélectionnez au moins un destinataire"),
  subject: z.string().min(1, "L'objet est requis"),
  body: z.string().min(1, "Le corps est requis"),
  closing: z.string().default(""),
  signatoryTitle: z.string().default(""),
});

export type MailMergePayload = z.infer<typeof mailMergeSchema>;

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function buildHtml(params: {
  body: string;
  closing: string;
  signatoryTitle: string;
  companyName: string;
}): string {
  const body = escapeHtml(params.body);
  const closing = escapeHtml(params.closing);
  const signatoryTitle = escapeHtml(params.signatoryTitle);
  const companyName = escapeHtml(params.companyName);

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; max-width: 640px; margin: 0 auto; padding: 32px 24px;">
  <div style="border-bottom: 2px solid #B45309; padding-bottom: 16px; margin-bottom: 24px;">
    <strong style="font-size: 18px; color: #B45309;">${companyName}</strong>
  </div>
  <div style="white-space: pre-line; line-height: 1.8; font-size: 14px;">
${body}
  </div>
  ${closing ? `<div style="margin-top: 32px; white-space: pre-line; font-size: 14px;">${closing}</div>` : ""}
  ${signatoryTitle ? `<div style="margin-top: 24px; font-size: 13px; color: #B45309;">${signatoryTitle}</div>` : ""}
  <div style="margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8;">
    ${companyName} — Document conforme aux usages OHADA / zone CEMAC
  </div>
</body>
</html>`.trim();
}

export const sendMailMerge = createServerFn({ method: "POST" })
  .validator(mailMergeSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const { fromEmail } = requireResendConfig();

    const clients = await prisma.client.findMany({
      where: { id: { in: data.clientIds } },
    });

    if (clients.length === 0) throw new Error("Aucun client trouvé");

    const company = (await prisma.company.findFirst()) ?? REAL_2REF_COMPANY;
    const resend = getResend();
    const from = formatFrom(company.name, fromEmail);

    const results: {
      clientId: string;
      clientName: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const client of clients) {
      if (!client.email?.trim()) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          success: false,
          error: "Pas d'email",
        });
        continue;
      }

      const vars: Record<string, string> = {
        nom: client.name,
        contact: client.contactName || client.name,
        adresse: client.address,
        ville: client.city,
        pays: client.country,
      };

      const personalizedBody = interpolate(data.body, vars);
      const personalizedSubject = interpolate(data.subject, vars);

      const html = buildHtml({
        body: personalizedBody,
        closing: data.closing,
        signatoryTitle: data.signatoryTitle || staff.jobTitle,
        companyName: company.name,
      });

      try {
        const { data: sent, error } = await resend.emails.send({
          from,
          to: client.email.trim(),
          subject: personalizedSubject,
          html,
        });
        if (error) {
          console.error("[publipostage] Resend error", client.email, error);
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: false,
            error: resendErrorMessage(error),
          });
        } else {
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: true,
          });
          if (sent?.id) {
            console.info("[publipostage] sent", client.email, sent.id);
          }
        }
      } catch (err) {
        console.error("[publipostage] exception", client.email, err);
        results.push({
          clientId: client.id,
          clientName: client.name,
          success: false,
          error: resendErrorMessage(err),
        });
      }
    }

    return {
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      from,
      details: results,
    };
  });

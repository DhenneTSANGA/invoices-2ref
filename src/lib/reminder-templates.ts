import {
  PAYMENT_REMINDER_DAYS,
  type PaymentReminderDay,
} from "@/lib/subscription";

export type ReminderTemplateFields = {
  subject: string;
  intro: string;
};

export type ReminderTemplates = Record<
  `${PaymentReminderDay}`,
  ReminderTemplateFields
>;

export const DEFAULT_REMINDER_TEMPLATES: ReminderTemplates = {
  "15": {
    subject: "Rappel — facture à régler ({{clientName}})",
    intro:
      "Sauf erreur de notre part, les factures ci-dessous restent impayées. Leur échéance approche. Nous vous remercions de bien vouloir prévoir le règlement.",
  },
  "20": {
    subject: "2e relance — règlement avant échéance ({{clientName}})",
    intro:
      "Malgré notre précédent rappel, nous n'avons pas encore enregistré le règlement des factures listées ci-dessous. Merci de procéder au paiement avant la date d'échéance.",
  },
  "25": {
    subject: "Dernier rappel avant échéance ({{clientName}})",
    intro:
      "Il s'agit de notre dernier rappel avant échéance concernant les factures ci-dessous. Merci de nous contacter rapidement si un règlement a déjà été effectué.",
  },
};

export const REMINDER_TEMPLATE_LABELS: Record<
  `${PaymentReminderDay}`,
  { title: string; hint: string }
> = {
  "15": {
    title: "1re relance",
    hint: "Le 15 du mois, avant l’échéance",
  },
  "20": {
    title: "2e relance",
    hint: "Le 20 du mois, avant l’échéance",
  },
  "25": {
    title: "Dernier rappel",
    hint: "Le 25 du mois, avant l’échéance",
  },
};

function asFields(raw: unknown, fallback: ReminderTemplateFields): ReminderTemplateFields {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const intro = typeof o.intro === "string" ? o.intro.trim() : "";
  return {
    subject: subject || fallback.subject,
    intro: intro || fallback.intro,
  };
}

export function parseReminderTemplates(raw: unknown): ReminderTemplates {
  const src =
    raw && typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;
  const obj = src && typeof src === "object" ? (src as Record<string, unknown>) : {};
  return {
    "15": asFields(obj["15"], DEFAULT_REMINDER_TEMPLATES["15"]),
    "20": asFields(obj["20"], DEFAULT_REMINDER_TEMPLATES["20"]),
    "25": asFields(obj["25"], DEFAULT_REMINDER_TEMPLATES["25"]),
  };
}

export function applyReminderPlaceholders(
  text: string,
  vars: { clientName: string; companyName: string },
): string {
  return text
    .replaceAll("{{clientName}}", vars.clientName)
    .replaceAll("{{companyName}}", vars.companyName);
}

export function resolveReminderCopy(
  templates: ReminderTemplates | null | undefined,
  day: PaymentReminderDay,
  vars: { clientName: string; companyName: string },
): ReminderTemplateFields {
  const key = String(day) as `${PaymentReminderDay}`;
  const merged = parseReminderTemplates(templates);
  const fields = merged[key] ?? DEFAULT_REMINDER_TEMPLATES[key];
  return {
    subject: applyReminderPlaceholders(fields.subject, vars),
    intro: applyReminderPlaceholders(fields.intro, vars),
  };
}

export { PAYMENT_REMINDER_DAYS };

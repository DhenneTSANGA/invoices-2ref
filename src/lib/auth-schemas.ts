import { z } from "zod";
import { STAFF_JOB_TITLES } from "@/lib/cabinets";

const jobTitleValues = STAFF_JOB_TITLES.map((j) => j.value) as [
  (typeof STAFF_JOB_TITLES)[number]["value"],
  ...(typeof STAFF_JOB_TITLES)[number]["value"][],
];

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

export const cabinetSchema = z.enum(["conseil", "expertise_fiscale"], {
  error: "Choisissez votre cabinet",
});

export const signupStaffSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    jobTitle: z.enum(jobTitleValues, { error: "Choisissez votre poste" }),
    cabinet: cabinetSchema,
    email: z.string().email("Email invalide"),
    phone: z.string().min(8, "Téléphone requis"),
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  jobTitle: z.enum(jobTitleValues, { error: "Choisissez une fonction" }),
  cabinet: cabinetSchema,
  phone: z
    .string()
    .default("")
    .refine((v) => v.trim() === "" || v.trim().length >= 8, {
      message: "Téléphone trop court (8 caractères min)",
    }),
});

/** Mise à jour du profil collaborateur (hors email / cabinet / rôle). */
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  jobTitle: z.enum(jobTitleValues, { error: "Choisissez votre poste" }),
  phone: z
    .string()
    .default("")
    .refine((v) => v.trim() === "" || v.trim().length >= 8, {
      message: "Téléphone trop court (8 caractères min)",
    }),
});

export type StaffPayload = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  cabinet?: "conseil" | "expertise_fiscale" | null;
};

export function toStaffPayload(
  data: z.infer<typeof signupStaffSchema>,
): StaffPayload {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    jobTitle: data.jobTitle,
    email: data.email,
    phone: data.phone,
    cabinet: data.cabinet,
  };
}

export const companyInputSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional().nullable(),
  nif: z.string().min(1),
  niu: z.string().min(1),
  rccm: z.string().min(1),
  cnss: z.string().optional().nullable(),
  address: z.string().min(1),
  city: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  website: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
});

export const clientInputSchema = z.object({
  name: z.string().min(1),
  legalForm: z.string().min(1),
  nif: z.string().default(""),
  niu: z.string().default(""),
  rccm: z.string().default(""),
  contactName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Gabon"),
  ficheCircuitUrl: z.string().nullable().optional(),
  ficheCircuitName: z.string().nullable().optional(),
  ficheStatusUrl: z.string().nullable().optional(),
  ficheStatusName: z.string().nullable().optional(),
});

export const clientFicheUploadSchema = z.object({
  clientId: z.string().min(1),
  kind: z.enum(["circuit", "status"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  /** Contenu fichier en base64 (sans préfixe data:). */
  base64: z.string().min(1),
});

export const lineItemSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional().nullable(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  vatRate: z.number(),
  discount: z.number().default(0),
  tpsRate: z.number().default(0),
  cssRate: z.number().default(0),
});

export const documentInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["quotation", "invoice", "proforma", "letter"]),
  number: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum([
    "draft",
    "sent",
    "accepted",
    "rejected",
    "paid",
    "overdue",
    "archived",
    "cancelled",
  ]),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string().default("XAF"),
  notes: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  validityDays: z.number().optional().nullable(),
  executionTerms: z.string().optional().nullable(),
  incoterm: z.string().optional().nullable(),
  shippingNotes: z.string().optional().nullable(),
  disclaimer: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  salutation: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  closing: z.string().optional().nullable(),
  signatoryTitle: z.string().optional().nullable(),
  recipientOverride: z.string().optional().nullable(),
  items: z.array(lineItemSchema),
  subtotal: z.number(),
  tps: z.number().default(0),
  css: z.number().default(0),
  vat: z.number(),
  total: z.number(),
});

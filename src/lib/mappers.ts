import type { Decimal } from "@prisma/client/runtime/library";
import type {
  Client,
  CompanyInfo,
  Document,
  LineItem,
  NotificationItem,
  Service,
  StaffMember,
} from "@/store/types";
import { companyForPreview } from "@/lib/company-defaults";

export function decimalToNumber(v: Decimal | number | string): number {
  if (typeof v === "number") return v;
  return Number(v.toString());
}

export function mapStaff(row: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "member" | "admin" | "super_admin";
  cabinet: "conseil" | "expertise_fiscale" | null;
}): StaffMember {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    jobTitle: row.jobTitle,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    role: row.role,
    cabinet: row.cabinet,
  };
}

export function mapCompany(
  row: {
    cabinet?: "conseil" | "expertise_fiscale";
    name: string;
    tagline: string | null;
    nif: string;
    niu: string;
    rccm: string;
    cnss: string | null;
    address: string;
    city: string;
    phone: string;
    email: string;
    website: string | null;
    bankName: string | null;
    bankAccount: string | null;
  },
  cabinet?: "conseil" | "expertise_fiscale",
): CompanyInfo {
  return companyForPreview(row, row.cabinet ?? cabinet ?? "expertise_fiscale");
}

export function mapClient(row: {
  id: string;
  cabinet: "conseil" | "expertise_fiscale";
  name: string;
  legalForm: string;
  nif: string;
  niu: string;
  rccm: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  createdAt: Date;
}): Client {
  return {
    id: row.id,
    cabinet: row.cabinet,
    name: row.name,
    legalForm: row.legalForm,
    nif: row.nif,
    niu: row.niu,
    rccm: row.rccm,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function mapService(row: {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  unitPrice: Decimal;
  vatRate: Decimal;
  category: string;
}): Service {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    unit: row.unit,
    unitPrice: decimalToNumber(row.unitPrice),
    vatRate: decimalToNumber(row.vatRate),
    category: row.category,
  };
}

export function mapDocument(row: {
  id: string;
  cabinet: Document["cabinet"];
  type: Document["type"];
  number: string;
  clientId: string;
  createdById: string;
  status: Document["status"];
  issueDate: Date;
  dueDate: Date;
  subtotal: Decimal;
  tps: Decimal;
  css: Decimal;
  vat: Decimal;
  total: Decimal;
  currency: string;
  notes: string | null;
  paymentTerms: string | null;
  validityDays: number | null;
  executionTerms: string | null;
  incoterm: string | null;
  shippingNotes: string | null;
  disclaimer: string | null;
  subject: string | null;
  salutation: string | null;
  body: string | null;
  closing: string | null;
  signatoryTitle: string | null;
  recipientOverride: string | null;
  lines: Array<{
    id: string;
    serviceId: string | null;
    description: string;
    quantity: Decimal;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal;
    tpsRate: Decimal;
    cssRate: Decimal;
    position: number;
  }>;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    phone: string | null;
    avatarUrl: string | null;
    role: "member" | "admin" | "super_admin";
    cabinet: "conseil" | "expertise_fiscale" | null;
  };
}): Document {
  const items: LineItem[] = [...row.lines]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      serviceId: l.serviceId ?? undefined,
      description: l.description,
      quantity: decimalToNumber(l.quantity),
      unitPrice: decimalToNumber(l.unitPrice),
      vatRate: decimalToNumber(l.vatRate),
      discount: decimalToNumber(l.discount),
      tpsRate: decimalToNumber(l.tpsRate),
      cssRate: decimalToNumber(l.cssRate),
    }));

  return {
    id: row.id,
    cabinet: row.cabinet,
    type: row.type,
    number: row.number,
    clientId: row.clientId,
    createdById: row.createdById,
    status: row.status,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    dueDate: row.dueDate.toISOString().slice(0, 10),
    items,
    subtotal: decimalToNumber(row.subtotal),
    tps: decimalToNumber(row.tps),
    css: decimalToNumber(row.css),
    vat: decimalToNumber(row.vat),
    total: decimalToNumber(row.total),
    currency: row.currency,
    notes: row.notes ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    validityDays: row.validityDays ?? undefined,
    executionTerms: row.executionTerms ?? undefined,
    incoterm: row.incoterm ?? undefined,
    shippingNotes: row.shippingNotes ?? undefined,
    disclaimer: row.disclaimer ?? undefined,
    subject: row.subject ?? undefined,
    salutation: row.salutation ?? undefined,
    body: row.body ?? undefined,
    closing: row.closing ?? undefined,
    signatoryTitle: row.signatoryTitle ?? undefined,
    recipientOverride: row.recipientOverride ?? undefined,
    createdBy: row.createdBy ? mapStaff(row.createdBy) : undefined,
  };
}

export function mapNotification(row: {
  id: string;
  title: string;
  body: string;
  at: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
  documentId: string | null;
  document?: { type: Document["type"] } | null;
}): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: row.at.toISOString(),
    read: row.read,
    type: row.type,
    documentId: row.documentId ?? undefined,
    documentType: row.document?.type,
  };
}

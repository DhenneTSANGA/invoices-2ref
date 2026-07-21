export type StaffMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: "member" | "admin";
};

export type Client = {
  id: string;
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
  createdAt: string;
};

export type CompanyInfo = {
  name: string;
  tagline: string;
  nif: string;
  niu: string;
  rccm: string;
  cnss: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccount: string;
};

export type Service = {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
  vatRate: number;
  category: string;
};

export type LineItem = {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  tpsRate: number;
  cssRate: number;
};

export type DocumentType = "quotation" | "invoice" | "proforma" | "letter";
export type DocumentStatus = "draft" | "sent" | "accepted" | "rejected" | "paid" | "overdue" | "archived" | "cancelled";

export type Document = {
  id: string;
  type: DocumentType;
  number: string;
  clientId: string;
  createdById?: string;
  createdBy?: StaffMember;
  status: DocumentStatus;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  tps: number;
  css: number;
  vat: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
  /** Devis */
  validityDays?: number;
  executionTerms?: string;
  /** Pro forma */
  incoterm?: string;
  shippingNotes?: string;
  disclaimer?: string;
  /** Lettre commerciale */
  subject?: string;
  salutation?: string;
  body?: string;
  closing?: string;
  signatoryTitle?: string;
  recipientOverride?: string;
};

export type Activity = {
  id: string;
  kind: "invoice_paid" | "invoice_sent" | "invoice_overdue" | "quotation_accepted" | "quotation_sent" | "client_added";
  title: string;
  description: string;
  at: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
  documentId?: string;
  documentType?: DocumentType;
};

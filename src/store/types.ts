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

export type StaffRole = "member" | "admin";

export type StaffMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string;
  avatarUrl?: string;
  role: StaffRole;
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
};

export type DocumentType = "quotation" | "invoice" | "proforma" | "letter";
export type DocumentStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "paid"
  | "overdue"
  | "archived"
  | "cancelled";

export type Document = {
  id: string;
  type: DocumentType;
  number: string;
  clientId: string;
  createdById: string;
  createdBy?: StaffMember;
  status: DocumentStatus;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
  validityDays?: number;
  executionTerms?: string;
  incoterm?: string;
  shippingNotes?: string;
  disclaimer?: string;
  subject?: string;
  salutation?: string;
  body?: string;
  closing?: string;
  signatoryTitle?: string;
  recipientOverride?: string;
};

export type Activity = {
  id: string;
  kind:
    | "invoice_paid"
    | "invoice_sent"
    | "invoice_overdue"
    | "quotation_accepted"
    | "quotation_sent"
    | "client_added";
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
};

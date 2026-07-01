export type Client = {
  id: string;
  name: string;
  legalForm: string;
  ice: string;
  if: string;
  rc: string;
  patente: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  createdAt: string;
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

export type DocumentType = "quotation" | "invoice" | "proforma";
export type DocumentStatus = "draft" | "sent" | "accepted" | "rejected" | "paid" | "overdue" | "archived";

export type Document = {
  id: string;
  type: DocumentType;
  number: string;
  clientId: string;
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
};

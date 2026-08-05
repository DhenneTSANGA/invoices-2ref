export type StaffMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: "member" | "admin" | "super_admin";
  cabinet: "conseil" | "expertise_fiscale" | null;
};

export type Cabinet = "conseil" | "expertise_fiscale";

export type Client = {
  id: string;
  cabinet: Cabinet;
  name: string;
  /** Sigle / abréviation (fiche ANPI). */
  sigle: string;
  legalForm: string;
  /** Capital social (texte libre). */
  shareCapital: string;
  nif: string;
  niu: string;
  rccm: string;
  cnss: string;
  cnamgs: string;
  activity: string;
  activityDetail: string;
  /** Représentant légal. */
  contactName: string;
  /** Qualité (ex. Gérant). */
  representativeTitle: string;
  email: string;
  phone: string;
  address: string;
  /** Boîte postale (courriels). */
  bp: string;
  city: string;
  country: string;
  /** N° fiche ANPI (optionnel). */
  anpiNumber: string;
  /** Date fiche ANPI (optionnel). */
  anpiDate: string;
  ficheCircuitUrl?: string | null;
  ficheCircuitName?: string | null;
  ficheStatusUrl?: string | null;
  ficheStatusName?: string | null;
  createdById?: string | null;
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
  /** Adresse From Resend (domaine vérifié du cabinet). */
  mailFromEmail?: string;
  /** Reply-To (réponses clients). */
  mailReplyTo?: string;
  /** Nom du gérant (signataire). Vide jusqu'à configuration. */
  managerName?: string;
  /** URL du cachet. Vide jusqu'à configuration. */
  stampUrl?: string;
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
  createdById?: string | null;
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

export type DocumentType = "quotation" | "invoice" | "letter";
export type DocumentStatus = "draft" | "signed" | "sent" | "accepted" | "rejected" | "paid" | "overdue" | "archived" | "cancelled";
export type PaymentMethod = "cash" | "check" | "bank_transfer";
export type MailMergeStatus = "draft" | "pending_signature" | "signed" | "sent";

export type Document = {
  id: string;
  cabinet: Cabinet;
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
  /** Remise globale % (factures / devis). */
  discount?: number;
  tps: number;
  css: number;
  vat: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
  /** Renseigné quand la facture est marquée payée. */
  paymentMethod?: PaymentMethod | null;
  /** Modèle d'abonnement mensuel (désignation modifiable). */
  isSubscription?: boolean;
  subscriptionActive?: boolean;
  subscriptionDay?: number | null;
  subscriptionNextAt?: string | null;
  subscriptionOfId?: string | null;
  mailMergeCampaignId?: string | null;
  /** Devis */
  validityDays?: number;
  executionTerms?: string;
  /** Courriel commercial */
  subject?: string;
  salutation?: string;
  body?: string;
  closing?: string;
  signatoryTitle?: string;
  recipientOverride?: string;
};

export type MailMergeCampaign = {
  id: string;
  cabinet: Cabinet;
  createdById: string;
  status: MailMergeStatus;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatoryTitle: string;
  issueDate: string;
  signedAt?: string | null;
  signedById?: string | null;
  signatureRequestedAt?: string | null;
  signatureRequestedById?: string | null;
  signatureRejectedAt?: string | null;
  signatureRejectNote?: string | null;
  sentAt?: string | null;
  createdAt: string;
  documentCount: number;
  documents?: Document[];
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

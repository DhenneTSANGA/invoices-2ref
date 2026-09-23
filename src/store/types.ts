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

/** Profil de facturation client. */
export type ClientBillingProfile = "subscription" | "one_off" | "mixed";

/** Pôle métier. */
export type ClientPole = import("@/lib/client-pole").ClientPole;

export type Client = {
  id: string;
  cabinet: Cabinet;
  name: string;
  /** Sigle / abréviation (fiche ANPI). */
  sigle: string;
  legalForm: string;
  /** Capital social (texte libre). */
  shareCapital: string;
  /** Identifiant métier (facture / devis). */
  clientRef: string;
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
  /** Abonnement / ponctuel / les deux. */
  billingProfile: ClientBillingProfile;
  /** Pôle métier (formation, audit, juridique, comptabilité). */
  pole: ClientPole;
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
  /** Forme / capital social affiché sur l’émetteur (facture / devis). */
  capital: string;
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
  /** E-mail du gérant (CC des envois clients). */
  managerEmail?: string;
  /** URL du cachet. Vide jusqu'à configuration. */
  stampUrl?: string;
  /** Couleur primaire de l’interface (hex). */
  primaryColor?: string;
  /** Modèles des e-mails de relance (15 / 20 / 25 du mois, avant échéance). */
  reminderTemplates?: import("@/lib/reminder-templates").ReminderTemplates;
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
  /** Section / tâche parente (optionnel). */
  sectionId?: string | null;
  description: string;
  quantity: number;
  /** quantity | month | year | none — mois/année se calculent comme une quantité. */
  quantityUnit?: import("@/lib/line-quantity").LineQuantityUnit;
  /** Masquer P.U. HT et total HT nuls sur le papier (2R Conseil). */
  hideZeroFigures?: boolean;
  unitPrice: number;
  vatRate: number;
  discount: number;
  tpsRate: number;
  cssRate: number;
};

/** Titre de regroupement optionnel (ex. « AUDIT FISCAL ») sur facture / devis. */
export type DocumentSection = {
  id: string;
  title: string;
  position: number;
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
  /** Pôle du document (prérempli depuis le client). */
  pole?: import("@/lib/client-pole").ClientPole;
  createdById?: string;
  createdBy?: StaffMember;
  status: DocumentStatus;
  issueDate: string;
  /** Optionnel — vide = aucune échéance affichée. */
  dueDate?: string | null;
  items: LineItem[];
  /** Sections optionnelles (vides = facture / devis classique). */
  sections?: DocumentSection[];
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
  /** Afficher le bloc RIB société sur le document. */
  showRib?: boolean;
  /** Renseigné quand la facture est marquée payée. */
  paymentMethod?: PaymentMethod | null;
  /** Modèle d'abonnement mensuel (désignation modifiable). */
  isSubscription?: boolean;
  subscriptionActive?: boolean;
  subscriptionDay?: number | null;
  subscriptionNextAt?: string | null;
  subscriptionDueDay?: number | null;
  subscriptionDueMonthsOffset?: number | null;
  subscriptionOfId?: string | null;
  /** Suffixer les désignations avec le mois d’émission (optionnel). */
  showDueMonthOnLines?: boolean;
  /** 2R Conseil : masquer qté / P.U. / total nuls (défaut true). */
  hideZeroLineFigures?: boolean;
  /** Ajustement manuel du TTC en XAF (ex. -1 pour 175 001 → 175 000). */
  totalRounding?: number;
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
  /** Ville d’émission affichée (« Libreville, le … »). */
  placeCity?: string | null;
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

import type { Client, Service, Document, LineItem, Activity, NotificationItem, StaffMember } from "@/store/types";

export const seedStaff: StaffMember[] = [
  {
    id: "staff-mireille",
    email: "mireille@2ref.ga",
    firstName: "Mireille",
    lastName: "Nguema",
    jobTitle: "Expert-comptable",
    role: "admin",
    avatarUrl: undefined,
  },
  {
    id: "staff-jean",
    email: "jean@2ref.ga",
    firstName: "Jean",
    lastName: "Mba",
    jobTitle: "Collaborateur fiscal",
    role: "member",
  },
];

const staffById = (id: string) => seedStaff.find((s) => s.id === id)!;

export const seedClients: Client[] = [
  { id: "c1", name: "Okoumba Médical SARL", legalForm: "SARL", nif: "GA20245678901", niu: "M012345678901A", rccm: "GA-LBV-01-2020-B12-00045", contactName: "Jean-Baptiste Ndong", email: "contact@okoumba-medical.ga", phone: "+241 07 11 22 33", address: "12 Boulevard Triomphal", city: "Libreville", country: "Gabon", createdAt: "2024-01-12" },
  { id: "c2", name: "Cabinet Équinoxe", legalForm: "SA", nif: "GA20241234567", niu: "M012345678902B", rccm: "GA-LBV-01-2018-B12-00056", contactName: "Patricia Mengue", email: "patricia@equinoxe.ga", phone: "+241 07 22 33 44", address: "45 Avenue du Colonel Parant", city: "Libreville", country: "Gabon", createdAt: "2024-02-03" },
  { id: "c3", name: "Port-Gentil Hotels Group", legalForm: "SA", nif: "GA20249876543", niu: "M012345678903C", rccm: "GA-POG-01-2015-B12-00067", contactName: "Omar Boussougou", email: "o.boussougou@pgh.ga", phone: "+241 07 33 44 55", address: "Boulevard de la Mer", city: "Port-Gentil", country: "Gabon", createdAt: "2024-02-18" },
  { id: "c4", name: "Owendo Logistique", legalForm: "SARL", nif: "GA20245566778", niu: "M012345678904D", rccm: "GA-OWE-01-2019-B12-00078", contactName: "Hicham Mba", email: "h.mba@owendo-log.ga", phone: "+241 07 44 55 66", address: "Zone portuaire d'Owendo", city: "Owendo", country: "Gabon", createdAt: "2024-03-05" },
  { id: "c5", name: "Pêche Atlantique Gabon", legalForm: "SARL", nif: "GA20256677889", niu: "M012345678905E", rccm: "GA-POG-01-2021-B12-00089", contactName: "Nadia Obame", email: "nadia@pag.ga", phone: "+241 07 55 66 77", address: "Quai de pêche", city: "Port-Gentil", country: "Gabon", createdAt: "2024-03-22" },
  { id: "c6", name: "Tropic Textile SA", legalForm: "SA", nif: "GA20267788990", niu: "M012345678906F", rccm: "GA-LBV-01-2016-B12-00090", contactName: "Karim Essono", email: "karim@tropic-textile.ga", phone: "+241 07 66 77 88", address: "Quartier Glass", city: "Libreville", country: "Gabon", createdAt: "2024-04-08" },
  { id: "c7", name: "Artisanat Estuaire", legalForm: "Entreprise individuelle", nif: "GA20278899001", niu: "M012345678907G", rccm: "GA-LBV-01-2022-A12-00011", contactName: "Mehdi Nze", email: "mehdi@artisanat-estuaire.ga", phone: "+241 07 77 88 99", address: "Marché du Mont-Bouët", city: "Libreville", country: "Gabon", createdAt: "2024-04-15" },
  { id: "c8", name: "Franceville Construction", legalForm: "SARL", nif: "GA20289900112", niu: "M012345678908H", rccm: "GA-FCV-01-2017-B12-00022", contactName: "Rachid Mouélé", email: "rachid@fcv-construction.ga", phone: "+241 07 88 99 00", address: "Avenue Hassan II", city: "Franceville", country: "Gabon", createdAt: "2024-05-01" },
  { id: "c9", name: "Énergie du Plateau SA", legalForm: "SA", nif: "GA20290011223", niu: "M012345678909I", rccm: "GA-LBV-01-2014-B12-00033", contactName: "Imane Maganga", email: "imane@energie-plateau.ga", phone: "+241 07 99 00 11", address: "Boulevard du Bord de Mer", city: "Libreville", country: "Gabon", createdAt: "2024-05-19" },
  { id: "c10", name: "Agroforestier Haut-Ogooué", legalForm: "SARL", nif: "GA20201122334", niu: "M012345678910J", rccm: "GA-FCV-01-2020-B12-00044", contactName: "Youssef Koumba", email: "y.koumba@agroforestier.ga", phone: "+241 07 00 11 22", address: "Route de Moanda", city: "Franceville", country: "Gabon", createdAt: "2024-06-02" },
  { id: "c11", name: "Pharma CEMAC SA", legalForm: "SA", nif: "CM20211233445", niu: "M098765432109K", rccm: "CM-DLA-01-2019-B12-00055", contactName: "Leila Fotso", email: "leila@pharmacemac.cm", phone: "+237 6 12 34 56 78", address: "Rue de la Joie, Akwa", city: "Douala", country: "Cameroun", createdAt: "2024-06-20" },
  { id: "c12", name: "Studio Okoumé", legalForm: "SARL", nif: "GA20221344556", niu: "M012345678912L", rccm: "GA-LBV-01-2023-B12-00066", contactName: "Anas Biyoghé", email: "anas@studio-okoume.ga", phone: "+241 07 23 45 67", address: "Quartier Louis", city: "Libreville", country: "Gabon", createdAt: "2024-07-04" },
];

export const seedServices: Service[] = [
  { id: "s1", code: "EXP-001", name: "Tenue de comptabilité mensuelle", description: "Saisie, contrôle et rapprochement des écritures comptables OHADA.", unit: "mois", unitPrice: 250000, vatRate: 18, category: "Comptabilité" },
  { id: "s2", code: "EXP-002", name: "Déclaration TVA mensuelle", description: "Préparation et dépôt de la déclaration TVA CEMAC.", unit: "déclaration", unitPrice: 75000, vatRate: 18, category: "Fiscal" },
  { id: "s3", code: "EXP-003", name: "Établissement bilan annuel", description: "Production des états financiers OHADA et liasse fiscale.", unit: "exercice", unitPrice: 1200000, vatRate: 18, category: "Comptabilité" },
  { id: "s4", code: "EXP-004", name: "Déclaration IS", description: "Déclaration de l'impôt sur les sociétés.", unit: "déclaration", unitPrice: 200000, vatRate: 18, category: "Fiscal" },
  { id: "s5", code: "EXP-005", name: "Gestion de la paie", description: "Bulletins, CNSS, CNAMGS, IRPP.", unit: "bulletin", unitPrice: 8000, vatRate: 18, category: "Social" },
  { id: "s6", code: "EXP-006", name: "Audit légal", description: "Mission de commissariat aux comptes.", unit: "mission", unitPrice: 3500000, vatRate: 18, category: "Audit" },
  { id: "s7", code: "EXP-007", name: "Conseil fiscal stratégique", description: "Optimisation fiscale et accompagnement zone CEMAC.", unit: "heure", unitPrice: 65000, vatRate: 18, category: "Conseil" },
  { id: "s8", code: "EXP-008", name: "Création d'entreprise", description: "Constitution juridique OHADA complète (ANPI / guichet unique).", unit: "dossier", unitPrice: 450000, vatRate: 18, category: "Juridique" },
  { id: "s9", code: "EXP-009", name: "Procès-verbal d'assemblée", description: "Rédaction et dépôt légal au greffe.", unit: "PV", unitPrice: 120000, vatRate: 18, category: "Juridique" },
  { id: "s10", code: "EXP-010", name: "Domiciliation commerciale", description: "Adresse + gestion du courrier.", unit: "mois", unitPrice: 35000, vatRate: 18, category: "Juridique" },
  { id: "s11", code: "EXP-011", name: "Reporting financier mensuel", description: "Tableau de bord et indicateurs.", unit: "rapport", unitPrice: 180000, vatRate: 18, category: "Conseil" },
  { id: "s12", code: "EXP-012", name: "Assistance contrôle fiscal", description: "Préparation et représentation devant l'administration.", unit: "mission", unitPrice: 1500000, vatRate: 18, category: "Fiscal" },
  { id: "s13", code: "EXP-013", name: "Formation comptable", description: "Session intra-entreprise (SYSCOHADA).", unit: "journée", unitPrice: 480000, vatRate: 18, category: "Formation" },
  { id: "s14", code: "EXP-014", name: "Évaluation d'entreprise", description: "Méthodes multiples et rapport.", unit: "mission", unitPrice: 1800000, vatRate: 18, category: "Conseil" },
  { id: "s15", code: "EXP-015", name: "Gestion de trésorerie", description: "Prévisionnel et suivi en FCFA.", unit: "mois", unitPrice: 150000, vatRate: 18, category: "Conseil" },
];

const li = (sid: string, qty: number, services: Service[]): LineItem => {
  const s = services.find(x => x.id === sid)!;
  return { id: `li-${Math.random().toString(36).slice(2, 9)}`, serviceId: sid, description: s.name, quantity: qty, unitPrice: s.unitPrice, vatRate: s.vatRate, discount: 0 };
};

const makeDoc = (
  id: string, type: "quotation" | "invoice" | "proforma", number: string,
  clientId: string, status: Document["status"], dateISO: string, items: LineItem[],
  createdById: string,
  notes?: string,
  extra?: Partial<Document>,
): Document => {
  const creator = staffById(createdById);
  const subtotal = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100) * (b.vatRate / 100), 0);
  return {
    id, type, number, clientId, createdById, createdBy: creator, status,
    issueDate: dateISO,
    dueDate: type === "invoice" ? new Date(new Date(dateISO).getTime() + 30 * 86400000).toISOString().slice(0, 10) : new Date(new Date(dateISO).getTime() + 15 * 86400000).toISOString().slice(0, 10),
    items, subtotal, vat, total: subtotal + vat,
    currency: "XAF",
    notes: notes ?? "Règlement par virement bancaire — merci de mentionner la référence du document.",
    paymentTerms: "30 jours fin de mois",
    ...extra,
  };
};

const M = "staff-mireille";
const J = "staff-jean";

export const seedDocuments: Document[] = [
  makeDoc("d1", "invoice", "FA-2025-0142", "c1", "paid", "2025-11-04", [li("s1", 1, seedServices), li("s2", 1, seedServices)], M),
  makeDoc("d2", "invoice", "FA-2025-0143", "c3", "sent", "2025-11-12", [li("s1", 3, seedServices), li("s11", 1, seedServices)], J),
  makeDoc("d3", "invoice", "FA-2025-0144", "c6", "overdue", "2025-10-08", [li("s6", 1, seedServices)], M),
  makeDoc("d4", "quotation", "DV-2025-0089", "c9", "accepted", "2025-11-15", [li("s14", 1, seedServices), li("s7", 8, seedServices)], M, undefined, {
    validityDays: 30,
    executionTerms: "Mission d'évaluation réalisée à Libreville — délai 20 jours ouvrés après acceptation.",
    paymentTerms: "Acompte 40 % à la commande — solde à livraison.",
  }),
  makeDoc("d5", "quotation", "DV-2025-0090", "c2", "sent", "2025-11-18", [li("s3", 1, seedServices), li("s4", 1, seedServices)], J, undefined, {
    validityDays: 30,
    executionTerms: "Production des états financiers OHADA sous 45 jours.",
  }),
  makeDoc("d6", "invoice", "FA-2025-0145", "c5", "draft", "2025-11-22", [li("s1", 1, seedServices), li("s5", 24, seedServices)], J),
  makeDoc("d7", "invoice", "FA-2025-0146", "c11", "paid", "2025-11-01", [li("s3", 1, seedServices)], M),
  makeDoc("d8", "quotation", "DV-2025-0091", "c7", "draft", "2025-11-20", [li("s8", 1, seedServices)], J, undefined, { validityDays: 15 }),
  makeDoc("d9", "invoice", "FA-2025-0147", "c4", "sent", "2025-11-19", [li("s1", 1, seedServices), li("s2", 1, seedServices), li("s5", 12, seedServices)], M),
  makeDoc("d10", "proforma", "PF-2025-0017", "c8", "sent", "2025-11-23", [li("s12", 1, seedServices)], M, undefined, {
    incoterm: "CIP Franceville",
    shippingNotes: "Assistance contrôle fiscal — déplacement Haut-Ogooué inclus.",
    disclaimer: "Document prévisionnel sans valeur comptable ni fiscale. Ne constitue pas une facture définitive.",
  }),
  makeDoc("d11", "invoice", "FA-2025-0148", "c10", "paid", "2025-11-10", [li("s15", 3, seedServices)], J),
  makeDoc("d12", "quotation", "DV-2025-0092", "c12", "rejected", "2025-10-30", [li("s13", 2, seedServices)], J, undefined, { validityDays: 30 }),
  makeDoc("d13", "invoice", "FA-2025-0149", "c2", "sent", "2025-11-25", [li("s11", 1, seedServices)], M),
  makeDoc("d14", "quotation", "DV-2025-0093", "c6", "accepted", "2025-11-21", [li("s6", 1, seedServices), li("s4", 1, seedServices)], M, undefined, {
    validityDays: 45,
    executionTerms: "Audit légal selon référentiel OHADA.",
  }),
  makeDoc("d16", "invoice", "FA-2025-0150", "c7", "cancelled", "2025-11-08", [li("s1", 1, seedServices)], J, "Facture annulée à la demande du client."),
  makeDoc("d17", "quotation", "DV-2025-0094", "c3", "cancelled", "2025-11-05", [li("s7", 4, seedServices)], J, undefined, {
    validityDays: 15,
    executionTerms: "Annulé avant acceptation.",
  }),
  {
    id: "d15",
    type: "letter",
    number: "LT-2025-008",
    clientId: "c4",
    createdById: M,
    createdBy: staffById(M),
    status: "sent",
    issueDate: "2025-11-21",
    dueDate: "2025-11-21",
    items: [],
    subtotal: 0,
    vat: 0,
    total: 0,
    currency: "XAF",
    subject: "Relance de paiement — FA-2025-0147",
    salutation: "Madame, Monsieur,",
    body: "Nous nous permettons de vous rappeler que la facture FA-2025-0147 adressée à Owendo Logistique demeure en attente de règlement.\n\nSauf erreur ou omission de notre part, aucun paiement n'a été enregistré à ce jour. Nous vous prions de bien vouloir régulariser cette situation dans un délai de huit (8) jours.\n\nRestant à votre disposition, nous vous prions d'agréer nos salutations distinguées.",
    closing: "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
    signatoryTitle: "Expert-comptable",
  },
];

export const seedActivity: Activity[] = [
  { id: "a1", kind: "invoice_paid", title: "Facture FA-2025-0142 réglée", description: "Okoumba Médical SARL a réglé 383 500 XAF", at: "2025-11-26T09:14:00Z" },
  { id: "a2", kind: "quotation_accepted", title: "Devis DV-2025-0089 accepté", description: "Énergie du Plateau SA a accepté votre proposition", at: "2025-11-25T16:48:00Z" },
  { id: "a3", kind: "invoice_sent", title: "Facture FA-2025-0149 envoyée", description: "Envoyée à Cabinet Équinoxe par email", at: "2025-11-25T11:02:00Z" },
  { id: "a4", kind: "client_added", title: "Nouveau client ajouté", description: "Studio Okoumé a rejoint votre portefeuille", at: "2025-11-24T14:21:00Z" },
  { id: "a5", kind: "invoice_overdue", title: "Facture en retard", description: "FA-2025-0144 — Tropic Textile SA (18 jours)", at: "2025-11-23T08:00:00Z" },
  { id: "a6", kind: "quotation_sent", title: "Devis DV-2025-0090 envoyé", description: "Envoyé à Cabinet Équinoxe", at: "2025-11-22T17:39:00Z" },
];

export const seedNotifications: NotificationItem[] = [
  { id: "n1", title: "Paiement reçu", body: "Okoumba Médical a réglé FA-2025-0142", at: "2025-11-26T09:14:00Z", read: false, type: "success" },
  { id: "n2", title: "Devis accepté", body: "Énergie du Plateau SA a accepté DV-2025-0089", at: "2025-11-25T16:48:00Z", read: false, type: "success" },
  { id: "n3", title: "Facture en retard", body: "FA-2025-0144 — Tropic Textile SA", at: "2025-11-23T08:00:00Z", read: false, type: "warning" },
  { id: "n4", title: "Rappel automatique envoyé", body: "Relance n°2 à Owendo Logistique", at: "2025-11-21T10:00:00Z", read: true, type: "info" },
  { id: "n5", title: "Sauvegarde quotidienne", body: "Toutes vos données sont sécurisées", at: "2025-11-20T03:00:00Z", read: true, type: "info" },
];

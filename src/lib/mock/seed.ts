import type { Client, Service, Document, LineItem, Activity, NotificationItem } from "@/store/types";

export const seedClients: Client[] = [
  { id: "c1", name: "Atlas Médical SARL", legalForm: "SARL", ice: "002345678000045", if: "40123456", rc: "78912", patente: "12345678", contactName: "Yassine El Amrani", email: "contact@atlas-medical.ma", phone: "+212 522 11 22 33", address: "12 Rue Tarik Ibn Ziad", city: "Casablanca", country: "Maroc", createdAt: "2024-01-12" },
  { id: "c2", name: "Cabinet Lumière", legalForm: "SA", ice: "001122334000056", if: "40234567", rc: "23456", patente: "23456789", contactName: "Salma Bennani", email: "salma@lumiere.ma", phone: "+212 537 22 33 44", address: "45 Avenue Mohammed V", city: "Rabat", country: "Maroc", createdAt: "2024-02-03" },
  { id: "c3", name: "Marrakech Hotels Group", legalForm: "SA", ice: "003344556000067", if: "40345678", rc: "34567", patente: "34567890", contactName: "Omar Tazi", email: "o.tazi@mhg.ma", phone: "+212 524 33 44 55", address: "Boulevard de la Menara", city: "Marrakech", country: "Maroc", createdAt: "2024-02-18" },
  { id: "c4", name: "Tanger Logistique", legalForm: "SARL", ice: "004455667000078", if: "40456789", rc: "45678", patente: "45678901", contactName: "Hicham Idrissi", email: "h.idrissi@tlog.ma", phone: "+212 539 44 55 66", address: "Zone Franche TFZ", city: "Tanger", country: "Maroc", createdAt: "2024-03-05" },
  { id: "c5", name: "Agadir Pêche & Conserves", legalForm: "SARL", ice: "005566778000089", if: "40567890", rc: "56789", patente: "56789012", contactName: "Nadia Belhaj", email: "nadia@apc.ma", phone: "+212 528 55 66 77", address: "Port d'Agadir", city: "Agadir", country: "Maroc", createdAt: "2024-03-22" },
  { id: "c6", name: "Royal Textile", legalForm: "SA", ice: "006677889000090", if: "40678901", rc: "67890", patente: "67890123", contactName: "Karim El Fassi", email: "karim@royal-textile.ma", phone: "+212 522 66 77 88", address: "Sidi Bernoussi", city: "Casablanca", country: "Maroc", createdAt: "2024-04-08" },
  { id: "c7", name: "Fès Artisanat Premium", legalForm: "Auto-entrepreneur", ice: "007788990000011", if: "40789012", rc: "78901", patente: "78901234", contactName: "Mehdi Alaoui", email: "mehdi@fesartisanat.ma", phone: "+212 535 77 88 99", address: "Médina de Fès", city: "Fès", country: "Maroc", createdAt: "2024-04-15" },
  { id: "c8", name: "Oujda Construction", legalForm: "SARL", ice: "008899001000022", if: "40890123", rc: "89012", patente: "89012345", contactName: "Rachid Berrada", email: "rachid@oujda-c.ma", phone: "+212 536 88 99 00", address: "Avenue Hassan II", city: "Oujda", country: "Maroc", createdAt: "2024-05-01" },
  { id: "c9", name: "Green Atlas Énergie", legalForm: "SA", ice: "009900112000033", if: "40901234", rc: "90123", patente: "90123456", contactName: "Imane Sefrioui", email: "imane@greenatlas.ma", phone: "+212 522 99 00 11", address: "Casablanca Finance City", city: "Casablanca", country: "Maroc", createdAt: "2024-05-19" },
  { id: "c10", name: "Sahara Agritech", legalForm: "SARL", ice: "001011223000044", if: "41012345", rc: "01234", patente: "01234567", contactName: "Youssef Naciri", email: "y.naciri@sahara-agri.ma", phone: "+212 528 00 11 22", address: "Route de Laâyoune", city: "Laâyoune", country: "Maroc", createdAt: "2024-06-02" },
  { id: "c11", name: "Mediterra Pharma", legalForm: "SA", ice: "001112334000055", if: "41123456", rc: "12345", patente: "12345600", contactName: "Leila Chraibi", email: "leila@medipharma.ma", phone: "+212 522 12 34 56", address: "Ain Sebaa", city: "Casablanca", country: "Maroc", createdAt: "2024-06-20" },
  { id: "c12", name: "Studio Onyx", legalForm: "SARL", ice: "001213445000066", if: "41234567", rc: "23450", patente: "23456700", contactName: "Anas Bensouda", email: "anas@studio-onyx.ma", phone: "+212 537 23 45 67", address: "Hay Riad", city: "Rabat", country: "Maroc", createdAt: "2024-07-04" },
];

export const seedServices: Service[] = [
  { id: "s1", code: "EXP-001", name: "Tenue de comptabilité mensuelle", description: "Saisie, contrôle et rapprochement des écritures comptables.", unit: "mois", unitPrice: 2500, vatRate: 20, category: "Comptabilité" },
  { id: "s2", code: "EXP-002", name: "Déclaration TVA mensuelle", description: "Préparation et télédéclaration TVA.", unit: "déclaration", unitPrice: 800, vatRate: 20, category: "Fiscal" },
  { id: "s3", code: "EXP-003", name: "Établissement bilan annuel", description: "Production des états de synthèse et liasse fiscale.", unit: "exercice", unitPrice: 12000, vatRate: 20, category: "Comptabilité" },
  { id: "s4", code: "EXP-004", name: "Déclaration IS", description: "Déclaration de l'impôt sur les sociétés.", unit: "déclaration", unitPrice: 2200, vatRate: 20, category: "Fiscal" },
  { id: "s5", code: "EXP-005", name: "Gestion de la paie", description: "Bulletins, CNSS, AMO, IR.", unit: "bulletin", unitPrice: 75, vatRate: 20, category: "Social" },
  { id: "s6", code: "EXP-006", name: "Audit légal", description: "Mission de commissariat aux comptes.", unit: "mission", unitPrice: 35000, vatRate: 20, category: "Audit" },
  { id: "s7", code: "EXP-007", name: "Conseil fiscal stratégique", description: "Optimisation fiscale et accompagnement.", unit: "heure", unitPrice: 650, vatRate: 20, category: "Conseil" },
  { id: "s8", code: "EXP-008", name: "Création d'entreprise", description: "Constitution juridique complète.", unit: "dossier", unitPrice: 4500, vatRate: 20, category: "Juridique" },
  { id: "s9", code: "EXP-009", name: "Procès-verbal d'assemblée", description: "Rédaction et dépôt légal.", unit: "PV", unitPrice: 1200, vatRate: 20, category: "Juridique" },
  { id: "s10", code: "EXP-010", name: "Domiciliation commerciale", description: "Adresse + gestion du courrier.", unit: "mois", unitPrice: 350, vatRate: 20, category: "Juridique" },
  { id: "s11", code: "EXP-011", name: "Reporting financier mensuel", description: "Tableau de bord et indicateurs.", unit: "rapport", unitPrice: 1800, vatRate: 20, category: "Conseil" },
  { id: "s12", code: "EXP-012", name: "Assistance contrôle fiscal", description: "Préparation et représentation.", unit: "mission", unitPrice: 15000, vatRate: 20, category: "Fiscal" },
  { id: "s13", code: "EXP-013", name: "Formation comptable", description: "Session intra-entreprise.", unit: "journée", unitPrice: 4800, vatRate: 20, category: "Formation" },
  { id: "s14", code: "EXP-014", name: "Évaluation d'entreprise", description: "Méthodes multiples et rapport.", unit: "mission", unitPrice: 18000, vatRate: 20, category: "Conseil" },
  { id: "s15", code: "EXP-015", name: "Gestion de trésorerie", description: "Prévisionnel et suivi.", unit: "mois", unitPrice: 1500, vatRate: 20, category: "Conseil" },
];

const li = (sid: string, qty: number, services: Service[]): LineItem => {
  const s = services.find(x => x.id === sid)!;
  return { id: `li-${Math.random().toString(36).slice(2, 9)}`, serviceId: sid, description: s.name, quantity: qty, unitPrice: s.unitPrice, vatRate: s.vatRate, discount: 0 };
};

const makeDoc = (
  id: string, type: "quotation" | "invoice" | "proforma", number: string,
  clientId: string, status: Document["status"], dateISO: string, items: LineItem[],
  notes?: string,
): Document => {
  const subtotal = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100) * (b.vatRate / 100), 0);
  return {
    id, type, number, clientId, status,
    issueDate: dateISO,
    dueDate: type === "invoice" ? new Date(new Date(dateISO).getTime() + 30 * 86400000).toISOString().slice(0, 10) : new Date(new Date(dateISO).getTime() + 15 * 86400000).toISOString().slice(0, 10),
    items, subtotal, vat, total: subtotal + vat,
    currency: "MAD",
    notes: notes ?? "Règlement par virement bancaire — merci de mentionner la référence du document.",
    paymentTerms: "30 jours fin de mois",
  };
};

export const seedDocuments: Document[] = [
  makeDoc("d1", "invoice", "FA-2025-0142", "c1", "paid", "2025-11-04", [li("s1", 1, seedServices), li("s2", 1, seedServices)]),
  makeDoc("d2", "invoice", "FA-2025-0143", "c3", "sent", "2025-11-12", [li("s1", 3, seedServices), li("s11", 1, seedServices)]),
  makeDoc("d3", "invoice", "FA-2025-0144", "c6", "overdue", "2025-10-08", [li("s6", 1, seedServices)]),
  makeDoc("d4", "quotation", "DV-2025-0089", "c9", "accepted", "2025-11-15", [li("s14", 1, seedServices), li("s7", 8, seedServices)]),
  makeDoc("d5", "quotation", "DV-2025-0090", "c2", "sent", "2025-11-18", [li("s3", 1, seedServices), li("s4", 1, seedServices)]),
  makeDoc("d6", "invoice", "FA-2025-0145", "c5", "draft", "2025-11-22", [li("s1", 1, seedServices), li("s5", 24, seedServices)]),
  makeDoc("d7", "invoice", "FA-2025-0146", "c11", "paid", "2025-11-01", [li("s3", 1, seedServices)]),
  makeDoc("d8", "quotation", "DV-2025-0091", "c7", "draft", "2025-11-20", [li("s8", 1, seedServices)]),
  makeDoc("d9", "invoice", "FA-2025-0147", "c4", "sent", "2025-11-19", [li("s1", 1, seedServices), li("s2", 1, seedServices), li("s5", 12, seedServices)]),
  makeDoc("d10", "proforma", "PF-2025-0017", "c8", "sent", "2025-11-23", [li("s12", 1, seedServices)]),
  makeDoc("d11", "invoice", "FA-2025-0148", "c10", "paid", "2025-11-10", [li("s15", 3, seedServices)]),
  makeDoc("d12", "quotation", "DV-2025-0092", "c12", "rejected", "2025-10-30", [li("s13", 2, seedServices)]),
  makeDoc("d13", "invoice", "FA-2025-0149", "c2", "sent", "2025-11-25", [li("s11", 1, seedServices)]),
  makeDoc("d14", "quotation", "DV-2025-0093", "c6", "accepted", "2025-11-21", [li("s6", 1, seedServices), li("s4", 1, seedServices)]),
];

export const seedActivity: Activity[] = [
  { id: "a1", kind: "invoice_paid", title: "Facture FA-2025-0142 réglée", description: "Atlas Médical SARL a réglé 3 960,00 MAD", at: "2025-11-26T09:14:00Z" },
  { id: "a2", kind: "quotation_accepted", title: "Devis DV-2025-0089 accepté", description: "Green Atlas Énergie a accepté votre proposition", at: "2025-11-25T16:48:00Z" },
  { id: "a3", kind: "invoice_sent", title: "Facture FA-2025-0149 envoyée", description: "Envoyée à Cabinet Lumière par email", at: "2025-11-25T11:02:00Z" },
  { id: "a4", kind: "client_added", title: "Nouveau client ajouté", description: "Studio Onyx a rejoint votre portefeuille", at: "2025-11-24T14:21:00Z" },
  { id: "a5", kind: "invoice_overdue", title: "Facture en retard", description: "FA-2025-0144 — Royal Textile (18 jours)", at: "2025-11-23T08:00:00Z" },
  { id: "a6", kind: "quotation_sent", title: "Devis DV-2025-0090 envoyé", description: "Envoyé à Cabinet Lumière", at: "2025-11-22T17:39:00Z" },
];

export const seedNotifications: NotificationItem[] = [
  { id: "n1", title: "Paiement reçu", body: "Atlas Médical a réglé FA-2025-0142", at: "2025-11-26T09:14:00Z", read: false, type: "success" },
  { id: "n2", title: "Devis accepté", body: "Green Atlas Énergie a accepté DV-2025-0089", at: "2025-11-25T16:48:00Z", read: false, type: "success" },
  { id: "n3", title: "Facture en retard", body: "FA-2025-0144 — Royal Textile", at: "2025-11-23T08:00:00Z", read: false, type: "warning" },
  { id: "n4", title: "Rappel automatique envoyé", body: "Relance n°2 à Tanger Logistique", at: "2025-11-21T10:00:00Z", read: true, type: "info" },
  { id: "n5", title: "Sauvegarde quotidienne", body: "Toutes vos données sont sécurisées", at: "2025-11-20T03:00:00Z", read: true, type: "info" },
];

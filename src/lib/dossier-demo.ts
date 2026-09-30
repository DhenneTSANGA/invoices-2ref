import type { ClientPole } from "@/lib/client-pole";

export type TaxFileKind =
  | "dsf"
  | "das"
  | "tva"
  | "cnss"
  | "cnamgs"
  | "is"
  | "agrement"
  | "statuts";

export type TaxFileStatus =
  | "a_preparer"
  | "en_cours"
  | "depose"
  | "valide"
  | "en_retard";

export type GedKind =
  | "identite"
  | "fiscal"
  | "social"
  | "contrat"
  | "correspondance"
  | "autre";

export type MissionStatus = "planifiee" | "en_cours" | "terminee" | "en_pause";

export type TaxDeadline = {
  id: string;
  label: string;
  dueOn: string;
  done: boolean;
};

export type TaxFile = {
  id: string;
  clientName: string;
  pole: ClientPole;
  kind: TaxFileKind;
  year: number;
  title: string;
  status: TaxFileStatus;
  manager: string;
  notes: string;
  deadlines: TaxDeadline[];
};

export type GedAsset = {
  id: string;
  clientName: string;
  pole: ClientPole;
  kind: GedKind;
  name: string;
  year: number;
  pages: number;
  updatedAt: string;
  missing: boolean;
};

export type MissionTask = {
  id: string;
  label: string;
  done: boolean;
};

export type Mission = {
  id: string;
  clientName: string;
  pole: ClientPole;
  title: string;
  status: MissionStatus;
  startOn: string;
  endOn: string;
  owner: string;
  tasks: MissionTask[];
};

export const TAX_KIND_LABELS: Record<TaxFileKind, string> = {
  dsf: "DSF",
  das: "DAS",
  tva: "TVA",
  cnss: "CNSS",
  cnamgs: "CNAMGS",
  is: "IS",
  agrement: "Agrément",
  statuts: "Statuts / RCCM",
};

export const TAX_STATUS_LABELS: Record<TaxFileStatus, string> = {
  a_preparer: "À préparer",
  en_cours: "En cours",
  depose: "Déposé",
  valide: "Validé",
  en_retard: "En retard",
};

export const GED_KIND_LABELS: Record<GedKind, string> = {
  identite: "Identité",
  fiscal: "Fiscal",
  social: "Social",
  contrat: "Contrat",
  correspondance: "Courrier",
  autre: "Autre",
};

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  en_pause: "En pause",
};

export function createDossierDemoSeed(): {
  files: TaxFile[];
  assets: GedAsset[];
  missions: Mission[];
} {
  return {
    files: [
      {
        id: "tf-ap-dsf",
        clientName: "AP HOLDING",
        pole: "comptabilite",
        kind: "dsf",
        year: 2025,
        title: "Déclaration statistique et fiscale 2025",
        status: "en_cours",
        manager: "Burelle Boukota",
        notes: "Pièces bancaires reçues. Reste le tableau des immobilisations.",
        deadlines: [
          { id: "tf-ap-dsf-1", label: "Collecte des pièces", dueOn: "2026-03-15", done: true },
          { id: "tf-ap-dsf-2", label: "Brouillon DSF", dueOn: "2026-04-10", done: true },
          { id: "tf-ap-dsf-3", label: "Dépôt DGI", dueOn: "2026-04-30", done: false },
        ],
      },
      {
        id: "tf-ap-das",
        clientName: "AP HOLDING",
        pole: "comptabilite",
        kind: "das",
        year: 2025,
        title: "Déclaration annuelle des salaires 2025",
        status: "a_preparer",
        manager: "Yasmine Tsogou",
        notes: "En attente du journal de paie décembre.",
        deadlines: [
          { id: "tf-ap-das-1", label: "Journal de paie", dueOn: "2026-01-20", done: false },
          { id: "tf-ap-das-2", label: "Dépôt DAS", dueOn: "2026-01-31", done: false },
        ],
      },
      {
        id: "tf-ista-tva",
        clientName: "ISTA",
        pole: "comptabilite",
        kind: "tva",
        year: 2026,
        title: "TVA septembre 2026",
        status: "en_retard",
        manager: "Burelle Boukota",
        notes: "Échéance mensuelle dépassée — relancer le client.",
        deadlines: [
          { id: "tf-ista-tva-1", label: "Saisie des factures", dueOn: "2026-09-20", done: true },
          { id: "tf-ista-tva-2", label: "Télédéclaration", dueOn: "2026-09-25", done: false },
        ],
      },
      {
        id: "tf-glt-cnss",
        clientName: "GABON LOISIR ET TOURISME",
        pole: "comptabilite",
        kind: "cnss",
        year: 2026,
        title: "Déclaration CNSS T3 2026",
        status: "depose",
        manager: "Yasmine Tsogou",
        notes: "Accusé de réception classé en GED.",
        deadlines: [
          { id: "tf-glt-cnss-1", label: "Bordereau", dueOn: "2026-10-05", done: true },
          { id: "tf-glt-cnss-2", label: "Paiement cotisations", dueOn: "2026-10-15", done: false },
        ],
      },
      {
        id: "tf-anac-frm",
        clientName: "Agence Nationale de l'aviation Civile",
        pole: "formation",
        kind: "agrement",
        year: 2026,
        title: "Renouvellement agrément organisme de formation",
        status: "en_cours",
        manager: "Romaric Boulingui",
        notes: "Programme pédagogique à joindre.",
        deadlines: [
          { id: "tf-anac-1", label: "Dossier pédagogique", dueOn: "2026-10-12", done: true },
          { id: "tf-anac-2", label: "Dépôt ministère", dueOn: "2026-11-02", done: false },
        ],
      },
      {
        id: "tf-cap-jur",
        clientName: "CAP CARAVANE",
        pole: "juridique",
        kind: "statuts",
        year: 2026,
        title: "Mise à jour statuts et RCCM",
        status: "valide",
        manager: "Audray Tiwinot",
        notes: "Statuts signés. Exemplaire ANPI en GED.",
        deadlines: [
          { id: "tf-cap-1", label: "Projet d’actes", dueOn: "2026-08-01", done: true },
          { id: "tf-cap-2", label: "Dépôt greffe", dueOn: "2026-08-20", done: true },
        ],
      },
      {
        id: "tf-bgfi-audit",
        clientName: "BGFI BOURSE",
        pole: "audit",
        kind: "dsf",
        year: 2025,
        title: "Revue des comptes avant DSF",
        status: "a_preparer",
        manager: "Léa Mikala",
        notes: "Mission d’audit liée — démarrer après la planification.",
        deadlines: [
          { id: "tf-bgfi-1", label: "Lettre de mission", dueOn: "2026-10-08", done: false },
          { id: "tf-bgfi-2", label: "Revue dossier", dueOn: "2026-11-15", done: false },
        ],
      },
    ],
    assets: [
      {
        id: "ged-ap-nif",
        clientName: "AP HOLDING",
        pole: "comptabilite",
        kind: "identite",
        name: "Attestation NIF.pdf",
        year: 2024,
        pages: 2,
        updatedAt: "2026-08-07",
        missing: false,
      },
      {
        id: "ged-ap-statuts",
        clientName: "AP HOLDING",
        pole: "juridique",
        kind: "identite",
        name: "Statuts consolidés.pdf",
        year: 2022,
        pages: 18,
        updatedAt: "2026-08-07",
        missing: false,
      },
      {
        id: "ged-ap-dsf",
        clientName: "AP HOLDING",
        pole: "comptabilite",
        kind: "fiscal",
        name: "Brouillon DSF 2025.xlsx",
        year: 2025,
        pages: 12,
        updatedAt: "2026-09-18",
        missing: false,
      },
      {
        id: "ged-ista-tva",
        clientName: "ISTA",
        pole: "comptabilite",
        kind: "fiscal",
        name: "Relevés TVA 2026.pdf",
        year: 2026,
        pages: 6,
        updatedAt: "2026-09-22",
        missing: true,
      },
      {
        id: "ged-anac-prog",
        clientName: "Agence Nationale de l'aviation Civile",
        pole: "formation",
        kind: "contrat",
        name: "Programme intra-entreprise.docx",
        year: 2026,
        pages: 9,
        updatedAt: "2026-09-28",
        missing: false,
      },
      {
        id: "ged-cap-rccm",
        clientName: "CAP CARAVANE",
        pole: "juridique",
        kind: "identite",
        name: "RCCM annoté.pdf",
        year: 2026,
        pages: 4,
        updatedAt: "2026-08-22",
        missing: false,
      },
      {
        id: "ged-glt-cnss",
        clientName: "GABON LOISIR ET TOURISME",
        pole: "comptabilite",
        kind: "social",
        name: "Accusé CNSS T3.pdf",
        year: 2026,
        pages: 1,
        updatedAt: "2026-09-12",
        missing: false,
      },
      {
        id: "ged-bgfi-lettre",
        clientName: "BGFI BOURSE",
        pole: "audit",
        kind: "correspondance",
        name: "Lettre de mission audit.pdf",
        year: 2026,
        pages: 3,
        updatedAt: "2026-09-01",
        missing: true,
      },
    ],
    missions: [
      {
        id: "ms-ap-cloture",
        clientName: "AP HOLDING",
        pole: "comptabilite",
        title: "Clôture annuelle et DSF",
        status: "en_cours",
        startOn: "2026-03-01",
        endOn: "2026-04-30",
        owner: "Burelle Boukota",
        tasks: [
          { id: "ms-ap-1", label: "Rapprochements bancaires", done: true },
          { id: "ms-ap-2", label: "Immobilisations", done: false },
          { id: "ms-ap-3", label: "Dépôt DSF", done: false },
        ],
      },
      {
        id: "ms-anac-frm",
        clientName: "Agence Nationale de l'aviation Civile",
        pole: "formation",
        title: "Session intra-entreprise — management",
        status: "planifiee",
        startOn: "2026-10-20",
        endOn: "2026-10-24",
        owner: "Romaric Boulingui",
        tasks: [
          { id: "ms-anac-1", label: "Convocations", done: true },
          { id: "ms-anac-2", label: "Supports", done: false },
          { id: "ms-anac-3", label: "Émargement", done: false },
        ],
      },
      {
        id: "ms-bgfi-audit",
        clientName: "BGFI BOURSE",
        pole: "audit",
        title: "Mission d’audit des comptes 2025",
        status: "planifiee",
        startOn: "2026-10-08",
        endOn: "2026-11-20",
        owner: "Léa Mikala",
        tasks: [
          { id: "ms-bgfi-1", label: "Plan de mission", done: false },
          { id: "ms-bgfi-2", label: "Contrôles substantifs", done: false },
          { id: "ms-bgfi-3", label: "Rapport", done: false },
        ],
      },
      {
        id: "ms-cap-jur",
        clientName: "CAP CARAVANE",
        pole: "juridique",
        title: "Suivi dépôts ANPI",
        status: "terminee",
        startOn: "2026-07-15",
        endOn: "2026-08-22",
        owner: "Audray Tiwinot",
        tasks: [
          { id: "ms-cap-1", label: "Actes", done: true },
          { id: "ms-cap-2", label: "Dépôt", done: true },
          { id: "ms-cap-3", label: "Classement GED", done: true },
        ],
      },
      {
        id: "ms-ista-tva",
        clientName: "ISTA",
        pole: "comptabilite",
        title: "Rattrapage TVA septembre",
        status: "en_pause",
        startOn: "2026-09-22",
        endOn: "2026-10-05",
        owner: "Burelle Boukota",
        tasks: [
          { id: "ms-ista-1", label: "Listing factures", done: true },
          { id: "ms-ista-2", label: "Télédéclaration", done: false },
        ],
      },
    ],
  };
}

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_DATA = {
  name: "2REF EXPERTISE FISCALE",
  tagline: "SARL au capital de 10 000 000 F CFA — Conseil Fiscal",
  nif: "202601003286 Z",
  niu: "—",
  rccm: "GALBV LBV 2026 B12 B1200162",
  cnss: null,
  address: "BP 20 478, Cité Bas de Gué-Gué",
  city: "Libreville, Gabon",
  phone: "011 44 39 64 / 065 10 99 10",
  email: "expertise.fiscale@2ref.ga",
  website: "www.2ref.ga",
  bankName: null,
  bankAccount: null,
};

const existing = await prisma.company.findFirst();
if (existing) {
  await prisma.company.update({ where: { id: existing.id }, data: COMPANY_DATA });
  console.log("Company mise à jour — 2REF EXPERTISE FISCALE");
} else {
  await prisma.company.create({ data: COMPANY_DATA });
  console.log("Company créée — 2REF EXPERTISE FISCALE");
}

const services = [
  {
    code: "COMPTA-M",
    name: "Tenue de comptabilité mensuelle",
    description: "Saisie, rapprochements bancaires et états mensuels",
    unit: "mois",
    unitPrice: 350000,
    vatRate: 18,
    category: "Comptabilité",
  },
  {
    code: "FISC-ANN",
    name: "Déclaration fiscale annuelle",
    description: "Préparation et dépôt des déclarations fiscales",
    unit: "dossier",
    unitPrice: 850000,
    vatRate: 18,
    category: "Fiscalité",
  },
  {
    code: "AUDIT",
    name: "Mission d'audit contractuel",
    description: "Audit des comptes et rapport d'audit",
    unit: "mission",
    unitPrice: 2500000,
    vatRate: 18,
    category: "Audit",
  },
];

for (const s of services) {
  await prisma.service.upsert({
    where: { code: s.code },
    create: s,
    update: s,
  });
}

console.log(`Seed OK — ${services.length} services, company singleton`);
await prisma.$disconnect();
